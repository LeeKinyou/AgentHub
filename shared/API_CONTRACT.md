# AgentHub API & WebSocket Communication Contract

> Version: 2.2.0 | Last Updated: 2026-06-02
> SSOT Sources: `shared/schemas/entities.json`, `shared/schemas/ws_messages.json`, `shared/types/*.ts`
>
> **v2.2 Breaking Changes**: WebSocket multiplexed single-connection model (removed `session_id` from handshake), added `joinSession`/`leaveSession`/`messageAck` signals, `apiKey` marked as WRITE-ONLY with mandatory DTO stripping.

---

## Table of Contents

1. [Conventions](#1-conventions)
2. [Entity Definitions](#2-entity-definitions)
3. [Authentication](#3-authentication)
4. [REST API](#4-rest-api)
5. [WebSocket Protocol](#5-websocket-protocol)
6. [Error Code Registry](#6-error-code-registry)

---

## 1. Conventions

### 1.1 Base URL

| Environment | REST Base URL | WebSocket URL |
|-------------|---------------|---------------|
| Development | `http://localhost:8000/api` | `ws://localhost:8000/ws` |
| Production | `https://api.agenthub.dev/api` | `wss://api.agenthub.dev/ws` |

### 1.2 UUID Format

All entity identifiers use **UUIDv7** (time-ordered), serialized as lowercase hyphenated string:

```
01929f5e-8a3c-7xxx-xxxx-xxxxxxxxxxxx
```

### 1.3 Timestamp Format

All timestamps use **ISO 8601** with UTC timezone:

```
2026-06-02T14:30:00.000Z
```

### 1.4 REST Response Envelope

All REST responses use a unified envelope:

```typescript
interface ApiResponse<T> {
  code: number;      // 0 = success, non-zero = business error
  data: T | null;    // Response payload (null on error)
  message: string;   // "success" or error description
}
```

### 1.5 Unified Error Contract (`AppError`)

REST and WebSocket share a single `AppError` interface for all error deserialization. Frontend MUST use this one type for both channels:

```typescript
interface AppError {
  errorCode: string;      // Uppercase snake_case from Error Registry
  errorMessage: string;   // Human-readable, frontend-displayable text
  recoverable: boolean;   // Whether client can safely retry
}
```

**REST Error Response** — wraps `AppError` inside the `ApiResponse` envelope:

```json
{
  "code": 404,
  "data": null,
  "message": "Session not found",
  "error": {
    "errorCode": "SESSION_NOT_FOUND",
    "errorMessage": "The requested session does not exist or has been deleted.",
    "recoverable": false
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| code | integer | Yes | HTTP-aligned business status code |
| data | null | Yes (on error) | Always null in error responses |
| message | string | Yes | Machine-readable error summary |
| error | [AppError](#15-unified-error-contract-apperror) | Yes (on error) | Structured error payload |

**WebSocket Error Response** — `AppError` fields are flattened into the `payload` alongside `sessionId`:

```json
{
  "type": "error",
  "timestamp": "2026-06-02T14:30:30.000Z",
  "payload": {
    "sessionId": "01929f5e-8a3c-7003-0001-000000000001",
    "errorCode": "SESSION_NOT_FOUND",
    "errorMessage": "The requested session does not exist or has been deleted.",
    "recoverable": false
  }
}
```

**Deserialization Pattern (TypeScript)**:

```typescript
function isAppError(obj: unknown): obj is AppError {
  return typeof obj === 'object' && obj !== null
    && 'errorCode' in obj
    && 'errorMessage' in obj
    && 'recoverable' in obj;
}

// REST: extract from response.error
// WS:   extract from event.payload (which also contains sessionId)
```

---

## 2. Entity Definitions

### 2.1 User

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| id | string (UUID) | Yes | Auto-generated (UUIDv7) | Unique user identifier |
| username | string (1-100) | Yes | - | Display name, unique |
| email | string (≤255) | No | null | Email address, unique when set |
| avatar | string (≤512) | No | null | Avatar URL or built-in icon identifier |
| createdAt | string (ISO 8601) | Yes | Server-generated | Account creation timestamp |

### 2.2 AgentProfile

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| id | string (UUID) | Yes | Auto-generated (UUIDv7) | Unique agent identifier |
| userId | string (UUID) \| null | No | null | Owner user ID; null = system agent |
| name | string (1-100) | Yes | - | Display name |
| avatar | string (≤512) | No | null | Avatar URL or icon identifier |
| role | `'orchestrator'` \| `'expert'` | Yes | - | Agent role type |
| adapterType | string | Yes | `'claude_code'` | LLM adapter: `'claude_code'` \| `'codex'` \| `'opencode'` \| `'custom'` |
| description | string | No | null | Capability description for agent marketplace |
| systemPrompt | string | No | null | System prompt template |
| agentConfig | [AgentConfig](#221-agentconfig) \| null | No | null | Adapter-specific configuration |
| connectionStatus | `'online'` \| `'offline'` \| `'busy'` | Yes | `'offline'` | **Network-layer** connection status |
| taskStatus | `'idle'` \| `'analyzing'` \| `'executing'` \| `'completed'` \| `'failed'` | Yes | `'idle'` | **Execution-layer** task status |
| createdAt | string (ISO 8601) | Yes | Server-generated | Creation timestamp |

> **Breaking Change (v2.0)**: The legacy `status` field has been decomposed into two independent dimensions:
> - `connectionStatus`: Reflects WebSocket/network connectivity state
> - `taskStatus`: Reflects current execution pipeline state
>
> These dimensions are orthogonal. An agent can be `connectionStatus: 'online'` + `taskStatus: 'idle'`, or `connectionStatus: 'online'` + `taskStatus: 'executing'`.

#### 2.2.1 AgentConfig

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| apiProvider | string | Yes | `'anthropic'` | LLM provider: `'anthropic'` \| `'openai'` |
| apiKey | string | Yes | - | **【WRITE-ONLY】** API key — accepted on `POST`/`PATCH`, **NEVER returned in any response** |
| baseUrl | string | No | `''` | Custom API endpoint |
| model | string | No | `''` | Model identifier |
| systemPrompt | string | No | null | Override system prompt |
| tools | [ToolDefinition[]](#222-tooldefinition) | No | `[]` | Function-calling tool definitions |
| skills | string[] | No | `[]` | Skill identifiers |
| mcpServers | [MCPServerConfig[]](#223-mcpserverconfig) | No | `[]` | MCP server configurations |

> **SECURITY — DTO STRIPPING**: The `apiKey` field is **write-only**. The server MUST strip `apiKey` from the response DTO in ALL REST endpoints (`GET /api/agents`, `GET /api/agents/{id}`, `POST /api/agents`, `PATCH /api/agents/{id}`). The field MUST NOT appear in any JSON response body under any circumstance. Violations of this rule constitute a **P0 security incident** (credential leakage via API response).

#### 2.2.2 ToolDefinition

Follows the OpenAI/Anthropic function-calling tool schema:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Tool function name (snake_case, unique within agent) |
| description | string | Yes | Human-readable description for LLM tool selection |
| parameters | [JSONSchema](#224-jsonschema) | Yes | Input parameter schema (JSON Schema draft-07) |

**Mock**:

```json
{
  "name": "read_file",
  "description": "Read the contents of a file at the given path",
  "parameters": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Absolute or relative file path"
      },
      "encoding": {
        "type": "string",
        "default": "utf-8",
        "description": "File encoding"
      }
    },
    "required": ["path"],
    "additionalProperties": false
  }
}
```

#### 2.2.3 MCPServerConfig

Follows the [Model Context Protocol (MCP) stdio transport specification](https://spec.modelcontextprotocol.io/specification/2024-11-05/basic/transports/):

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | Yes | - | Unique server identifier within this agent config |
| command | string | Yes | - | Executable path or command name (resolved via PATH) |
| args | string[] | No | `[]` | Command-line arguments |
| env | `Record<string, string>` | No | `{}` | Environment variables passed to the subprocess |
| transport | `'stdio'` | No | `'stdio'` | Transport protocol (currently only `stdio` is supported) |

**Mock (Filesystem MCP Server)**:

```json
{
  "name": "filesystem",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects"],
  "env": {},
  "transport": "stdio"
}
```

**Mock (Database MCP Server)**:

```json
{
  "name": "postgres",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-postgres"],
  "env": {
    "DATABASE_URL": "postgresql://user:pass@localhost:5432/mydb"
  },
  "transport": "stdio"
}
```

#### 2.2.4 JSONSchema

Represents a subset of JSON Schema draft-07 used for tool parameter definitions:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'object'` \| `'string'` \| `'number'` \| `'integer'` \| `'boolean'` \| `'array'` | Yes | JSON Schema type |
| properties | `Record<string, JSONSchema>` | No | Object property definitions |
| items | JSONSchema | No | Array item schema (required when `type = 'array'`) |
| required | string[] | No | Required property names |
| enum | (string \| number)[] | No | Allowed values |
| default | any | No | Default value |
| description | string | No | Human-readable description |
| additionalProperties | boolean | No | Whether to allow extra properties (default: true) |

### 2.3 Session

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| id | string (UUID) | Yes | Auto-generated (UUIDv7) | Unique session identifier |
| userId | string (UUID) | Yes | - | Owner user ID (foreign key → User.id) |
| projectId | string (UUID) | Yes | - | **Parent project ID for multi-project isolation and permission scoping** |
| title | string (≤255) | Yes | `'新对话'` | Session display title |
| type | `'single'` \| `'group'` | Yes | - | Session type |
| agentIds | string[] (UUID[]) | Yes | `[]` | Participating agent IDs |
| createdAt | string (ISO 8601) | Yes | Server-generated | Creation timestamp |
| updatedAt | string (ISO 8601) | Yes | Server-generated | Last update timestamp |

> **Breaking Change (v2.0)**: `projectId` is now mandatory. All session queries MUST be scoped by `(userId, projectId)` to enforce project-level data isolation.

### 2.4 Message

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| id | string (UUID) | Yes | Auto-generated (UUIDv7) | Unique message identifier |
| sessionId | string (UUID) | Yes | - | Parent session ID (foreign key → Session.id) |
| senderType | `'user'` \| `'agent'` | Yes | - | Sender type discriminator |
| senderId | string | Yes | - | User ID or Agent ID |
| content | string | Yes | `''` | Text or markdown content |
| contentType | `'text'` \| `'markdown'` \| `'card'` | Yes | `'text'` | Content type classification |
| cardData | [CardBlock[]](#25-cardblock-polymorphic) \| null | No | null | Structured artifact blocks (required when contentType = `'card'`) |
| createdAt | string (ISO 8601) | Yes | Server-generated | Creation timestamp |

> **Breaking Change (v2.0)**: `cardData` has been restructured from a flat object to a **polymorphic block array** to support multiple artifact types within a single message. See [CardBlock](#25-cardblock-polymorphic).

### 2.5 CardBlock (Polymorphic)

`cardData` is defined as `Array<CardBlock>`, where each block is a discriminated union:

```typescript
type CardBlock = DiffBlock | PreviewBlock | LogBlock | DeployBlock | CodeBlock;
```

| Discriminant `type` | Block Name | Use Case |
|---------------------|------------|----------|
| `'diffBlock'` | Code Diff | Unified diff with hunks, apply status |
| `'previewBlock'` | Web Preview | Iframe sandbox rendering (HTML/CSS/JS) |
| `'logBlock'` | Log Stream | Real-time log output with severity levels |
| `'deployBlock'` | Deploy Status | Deployment progress tracking |
| `'codeBlock'` | Static Code | Syntax-highlighted code snippet |

#### 2.5.1 DiffBlock

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'diffBlock'` | Yes | Block type discriminator |
| content | object | Yes | Block payload (see below) |

**content**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| filename | string | Yes | Target file path |
| language | string | Yes | Language identifier for syntax highlighting |
| additions | integer (≥0) | Yes | Number of added lines |
| deletions | integer (≥0) | Yes | Number of deleted lines |
| hunks | [DiffHunk[]](#252-diffhunk) | Yes | Array of diff hunks |
| status | `'pending'` \| `'applied'` \| `'rejected'` | Yes | Current apply status |

##### 2.5.2 DiffHunk

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| oldStart | integer (≥1) | Yes | Starting line in original file |
| oldLines | integer (≥0) | Yes | Line count in original file |
| newStart | integer (≥1) | Yes | Starting line in modified file |
| newLines | integer (≥0) | Yes | Line count in modified file |
| content | string | Yes | New content replacing old lines |
| oldContent | string | No | Expected old content for verification |

#### 2.5.3 PreviewBlock

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'previewBlock'` | Yes | Block type discriminator |
| content | object | Yes | Block payload (see below) |

**content**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| html | string | Yes | - | HTML content |
| css | string | No | `''` | CSS styles |
| js | string | No | `''` | JavaScript for interactivity |
| viewport | `'mobile'` \| `'tablet'` \| `'desktop'` | Yes | - | Viewport preset |

#### 2.5.4 LogBlock

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'logBlock'` | Yes | Block type discriminator |
| content | object | Yes | Block payload (see below) |

**content**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| entries | [DeployLogEntry[]](#255-deploylogentry) | Yes | Log entry array |

##### 2.5.5 DeployLogEntry

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| timestamp | string (ISO 8601) | Yes | Log entry timestamp |
| level | `'info'` \| `'warn'` \| `'error'` | Yes | Severity level |
| message | string | Yes | Log message content |

#### 2.5.6 DeployBlock

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'deployBlock'` | Yes | Block type discriminator |
| content | object | Yes | Block payload (see below) |

**content**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| status | `'queued'` \| `'building'` \| `'deploying'` \| `'live'` \| `'failed'` | Yes | - | Deployment status |
| progress | integer (0-100) | Yes | `0` | Progress percentage |
| previewUrl | string \| null | No | null | Live preview URL after success |
| logs | [DeployLogEntry[]](#255-deploylogentry) | Yes | `[]` | Deployment logs |

#### 2.5.7 CodeBlock

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'codeBlock'` | Yes | Block type discriminator |
| content | object | Yes | Block payload (see below) |

**content**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| language | string | Yes | Programming language identifier |
| code | string | Yes | Code content |
| title | string | Yes | Code block title or filename |

---

## 3. Authentication

### 3.1 Authentication Levels

| Level | Identifier | Description |
|-------|------------|-------------|
| `PUBLIC` | 🔓 | No authentication required |
| `AUTHENTICATED` | 🔒 | Requires valid JWT in `Authorization` header |
| `OWNER` | 🔐 | Requires JWT + resource ownership verification |

### 3.2 JWT Token Format

```
Authorization: Bearer <jwt>
```

**JWT Payload Claims**:

| Claim | Type | Description |
|-------|------|-------------|
| sub | string (UUID) | User ID |
| username | string | Display name |
| iat | integer | Issued at (Unix timestamp) |
| exp | integer | Expiration (Unix timestamp) |
| iss | string | Issuer: `'agenthub'` |

### 3.3 WebSocket Authentication

WebSocket connections authenticate via query parameter during handshake:

```
ws://localhost:8000/ws?session_id={sessionId}&token={jwt}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| session_id | string (UUID) | Yes | Target session ID |
| token | string (JWT) | Yes | Authentication token |

**Handshake Validation Flow**:
1. Validate `token` signature and expiration
2. Extract `userId` from JWT `sub` claim
3. Verify `session_id` exists and belongs to `userId`
4. If any check fails → return `HTTP 401` with close code `4001`

**WebSocket Close Codes**:

| Code | Meaning | Description |
|------|---------|-------------|
| 1000 | Normal Closure | Intentional disconnect |
| 4001 | Unauthorized | Invalid or expired token |
| 4003 | Forbidden | Session ownership mismatch |
| 4004 | Not Found | Session does not exist |
| 4008 | Timeout | Server-side idle timeout |

---

## 4. REST API

### 4.1 Health Check

#### `GET /health`

| Property | Value |
|----------|-------|
| Auth | `PUBLIC` 🔓 |
| Description | Service health check |

**Response**:

```json
{
  "status": "ok"
}
```

---

### 4.2 User Management

Base path: `/api/users`

#### `GET /api/users`

| Property | Value |
|----------|-------|
| Auth | `AUTHENTICATED` 🔒 |
| Description | List all users (admin) or current user |

**Response `200`**:

```json
{
  "code": 0,
  "data": [
    {
      "id": "01929f5e-8a3c-7001-0001-000000000001",
      "username": "alice",
      "email": "alice@example.com",
      "avatar": "https://cdn.agenthub.dev/avatars/alice.png",
      "createdAt": "2026-06-01T08:00:00.000Z"
    }
  ],
  "message": "success"
}
```

#### `POST /api/users`

| Property | Value |
|----------|-------|
| Auth | `PUBLIC` 🔓 |
| Description | Create a new user account |

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string (1-100) | Yes | Unique display name |
| email | string (≤255) | No | Email address |
| avatar | string (≤512) | No | Avatar URL |

**Request Body (Success)**:

```json
{
  "username": "bob",
  "email": "bob@example.com",
  "avatar": "https://cdn.agenthub.dev/avatars/bob.png"
}
```

**Response `200`**:

```json
{
  "code": 0,
  "data": {
    "id": "01929f5e-8a3c-7001-0001-000000000002",
    "username": "bob",
    "email": "bob@example.com",
    "avatar": "https://cdn.agenthub.dev/avatars/bob.png",
    "createdAt": "2026-06-02T14:30:00.000Z"
  },
  "message": "success"
}
```

**Response `400` (Duplicate Username)**:

```json
{
  "code": 400,
  "data": null,
  "message": "Username already exists",
  "error": {
    "errorCode": "USER_DUPLICATE_USERNAME",
    "errorMessage": "This username is already taken. Please choose a different one.",
    "recoverable": false
  }
}
```

#### `GET /api/users/{userId}`

| Property | Value |
|----------|-------|
| Auth | `AUTHENTICATED` 🔒 |
| Description | Get user by ID |

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| userId | string (UUID) | Target user ID |

**Response `200`**:

```json
{
  "code": 0,
  "data": {
    "id": "01929f5e-8a3c-7001-0001-000000000001",
    "username": "alice",
    "email": "alice@example.com",
    "avatar": "https://cdn.agenthub.dev/avatars/alice.png",
    "createdAt": "2026-06-01T08:00:00.000Z"
  },
  "message": "success"
}
```

**Response `404`**:

```json
{
  "code": 404,
  "data": null,
  "message": "User not found",
  "error": {
    "errorCode": "USER_NOT_FOUND",
    "errorMessage": "The requested user does not exist.",
    "recoverable": false
  }
}
```

#### `PATCH /api/users/{userId}`

| Property | Value |
|----------|-------|
| Auth | `OWNER` 🔐 |
| Description | Partially update user profile |

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| userId | string (UUID) | Target user ID |

**Request Body** (all fields optional):

| Field | Type | Description |
|-------|------|-------------|
| username | string (1-100) | New display name |
| email | string (≤255) \| null | New email (null to clear) |
| avatar | string (≤512) \| null | New avatar URL (null to clear) |

**Request Body**:

```json
{
  "username": "alice_updated",
  "avatar": "https://cdn.agenthub.dev/avatars/alice_v2.png"
}
```

**Response `200`**:

```json
{
  "code": 0,
  "data": {
    "id": "01929f5e-8a3c-7001-0001-000000000001",
    "username": "alice_updated",
    "email": "alice@example.com",
    "avatar": "https://cdn.agenthub.dev/avatars/alice_v2.png",
    "createdAt": "2026-06-01T08:00:00.000Z"
  },
  "message": "success"
}
```

#### `DELETE /api/users/{userId}`

| Property | Value |
|----------|-------|
| Auth | `OWNER` 🔐 |
| Description | Delete user account (cascades to sessions, messages) |

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| userId | string (UUID) | Target user ID |

**Response `200`**:

```json
{
  "code": 0,
  "data": null,
  "message": "deleted"
}
```

---

### 4.3 Agent Management

Base path: `/api/agents`

#### `GET /api/agents`

| Property | Value |
|----------|-------|
| Auth | `AUTHENTICATED` 🔒 |
| Description | List agents; optionally filter by userId |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string (UUID) | No | Filter: system agents + user's custom agents |

**Response `200`**:

```json
{
  "code": 0,
  "data": [
    {
      "id": "01929f5e-8a3c-7002-0001-000000000001",
      "userId": null,
      "name": "Code Orchestrator",
      "avatar": "https://cdn.agenthub.dev/agents/orchestrator.png",
      "role": "orchestrator",
      "adapterType": "claude_code",
      "description": "Master orchestrator for multi-agent code generation",
      "systemPrompt": null,
      "agentConfig": null,
      "connectionStatus": "online",
      "taskStatus": "idle",
      "createdAt": "2026-06-01T08:00:00.000Z"
    },
    {
      "id": "01929f5e-8a3c-7002-0001-000000000002",
      "userId": "01929f5e-8a3c-7001-0001-000000000001",
      "name": "My Custom Agent",
      "avatar": null,
      "role": "expert",
      "adapterType": "codex",
      "description": "Custom expert for frontend tasks",
      "systemPrompt": "You are a frontend specialist...",
      "agentConfig": {
        "apiProvider": "openai",
        "model": "gpt-4o",
        "tools": [],
        "skills": [],
        "mcpServers": []
      },
      "connectionStatus": "offline",
      "taskStatus": "idle",
      "createdAt": "2026-06-02T10:00:00.000Z"
    }
  ],
  "message": "success"
}
```

#### `GET /api/agents/{agentId}`

| Property | Value |
|----------|-------|
| Auth | `AUTHENTICATED` 🔒 |
| Description | Get agent by ID |

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| agentId | string (UUID) | Target agent ID |

**Response `200`**:

```json
{
  "code": 0,
  "data": {
    "id": "01929f5e-8a3c-7002-0001-000000000001",
    "userId": null,
    "name": "Code Orchestrator",
    "avatar": "https://cdn.agenthub.dev/agents/orchestrator.png",
    "role": "orchestrator",
    "adapterType": "claude_code",
    "description": "Master orchestrator for multi-agent code generation",
    "systemPrompt": null,
    "agentConfig": null,
    "connectionStatus": "online",
    "taskStatus": "idle",
    "createdAt": "2026-06-01T08:00:00.000Z"
  },
  "message": "success"
}
```

**Response `404`**:

```json
{
  "code": 404,
  "data": null,
  "message": "Agent not found",
  "error": {
    "errorCode": "AGENT_NOT_FOUND",
    "errorMessage": "The requested agent does not exist.",
    "recoverable": false
  }
}
```

#### `POST /api/agents`

| Property | Value |
|----------|-------|
| Auth | `AUTHENTICATED` 🔒 |
| Description | Create a new custom agent |

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string (UUID) \| null | No | Owner user ID (null = system agent) |
| name | string (1-100) | Yes | Agent display name |
| avatar | string (≤512) | No | Avatar URL |
| role | `'orchestrator'` \| `'expert'` | Yes | Agent role |
| adapterType | string | Yes | LLM adapter type |
| description | string | No | Capability description |
| systemPrompt | string | No | System prompt template |
| agentConfig | [AgentConfig](#221-agentconfig) | No | Adapter configuration |

**Request Body**:

```json
{
  "userId": "01929f5e-8a3c-7001-0001-000000000001",
  "name": "Frontend Expert",
  "role": "expert",
  "adapterType": "claude_code",
  "description": "Specialized in React and TypeScript frontend development",
  "systemPrompt": "You are a frontend specialist focused on React, TypeScript, and modern CSS.",
  "agentConfig": {
    "apiProvider": "anthropic",
    "model": "claude-sonnet-4-20250514",
    "tools": [],
    "skills": ["react", "typescript"],
    "mcpServers": []
  }
}
```

**Response `200`**:

```json
{
  "code": 0,
  "data": {
    "id": "01929f5e-8a3c-7002-0001-000000000003",
    "userId": "01929f5e-8a3c-7001-0001-000000000001",
    "name": "Frontend Expert",
    "avatar": null,
    "role": "expert",
    "adapterType": "claude_code",
    "description": "Specialized in React and TypeScript frontend development",
    "systemPrompt": "You are a frontend specialist focused on React, TypeScript, and modern CSS.",
    "agentConfig": {
      "apiProvider": "anthropic",
      "model": "claude-sonnet-4-20250514",
      "tools": [],
      "skills": ["react", "typescript"],
      "mcpServers": []
    },
    "connectionStatus": "offline",
    "taskStatus": "idle",
    "createdAt": "2026-06-02T14:30:00.000Z"
  },
  "message": "success"
}
```

#### `PATCH /api/agents/{agentId}`

| Property | Value |
|----------|-------|
| Auth | `OWNER` 🔐 |
| Description | Partially update agent configuration |

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| agentId | string (UUID) | Target agent ID |

**Request Body** (all fields optional):

| Field | Type | Description |
|-------|------|-------------|
| name | string (1-100) | Display name |
| avatar | string (≤512) \| null | Avatar URL |
| description | string \| null | Capability description |
| systemPrompt | string \| null | System prompt |
| agentConfig | [AgentConfig](#221-agentconfig) \| null | Adapter configuration |

> **SYSTEM-READONLY**: `connectionStatus` and `taskStatus` are **server-managed system fields**. They MUST NOT appear in any REST write payload. Attempting to include them results in `400 INVALID_REQUEST`. These fields are exclusively mutated by the server via internal orchestrator state transitions and WebSocket `agentStatus` pushes.

**Request Body**:

```json
{
  "name": "Frontend Expert v2",
  "agentConfig": {
    "apiProvider": "anthropic",
    "model": "claude-opus-4-20250514",
    "tools": [],
    "skills": ["react", "typescript", "nextjs"],
    "mcpServers": []
  }
}
```

**Response `200`**:

```json
{
  "code": 0,
  "data": {
    "id": "01929f5e-8a3c-7002-0001-000000000003",
    "userId": "01929f5e-8a3c-7001-0001-000000000001",
    "name": "Frontend Expert v2",
    "avatar": null,
    "role": "expert",
    "adapterType": "claude_code",
    "description": "Specialized in React and TypeScript frontend development",
    "systemPrompt": "You are a frontend specialist focused on React, TypeScript, and modern CSS.",
    "agentConfig": {
      "apiProvider": "anthropic",
      "model": "claude-opus-4-20250514",
      "tools": [],
      "skills": ["react", "typescript", "nextjs"],
      "mcpServers": []
    },
    "connectionStatus": "offline",
    "taskStatus": "idle",
    "createdAt": "2026-06-02T14:30:00.000Z"
  },
  "message": "success"
}
```

#### `DELETE /api/agents/{agentId}`

| Property | Value |
|----------|-------|
| Auth | `OWNER` 🔐 |
| Description | Delete custom agent |

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| agentId | string (UUID) | Target agent ID |

**Response `200`**:

```json
{
  "code": 0,
  "data": null,
  "message": "deleted"
}
```

---

### 4.4 Session Management

Base path: `/api/sessions`

> **Breaking Change (v2.1)**: Routes have been flattened from `/api/users/{userId}/sessions` to `/api/sessions`. The `userId` is now **exclusively derived from the JWT `sub` claim**. This eliminates the URL dual-source-of-truth vulnerability where a malicious client could forge `userId` in the URL path to probe other users' sessions.

#### `GET /api/sessions`

| Property | Value |
|----------|-------|
| Auth | `AUTHENTICATED` 🔒 |
| Description | List current user's sessions, optionally scoped by project |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | string (UUID) | No | Filter by project ID |

**Response `200`**:

```json
{
  "code": 0,
  "data": [
    {
      "id": "01929f5e-8a3c-7003-0001-000000000001",
      "userId": "01929f5e-8a3c-7001-0001-000000000001",
      "projectId": "01929f5e-8a3c-7004-0001-000000000001",
      "title": "Fix authentication bug",
      "type": "single",
      "agentIds": [
        "01929f5e-8a3c-7002-0001-000000000001"
      ],
      "createdAt": "2026-06-02T10:00:00.000Z",
      "updatedAt": "2026-06-02T14:30:00.000Z"
    }
  ],
  "message": "success"
}
```

#### `POST /api/sessions`

| Property | Value |
|----------|-------|
| Auth | `AUTHENTICATED` 🔒 |
| Description | Create a new session for the current user |

**Request Body**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| title | string (≤255) | No | `'新对话'` | Session title |
| type | `'single'` \| `'group'` | Yes | - | Session type |
| projectId | string (UUID) | Yes | - | Parent project ID |
| agentIds | string[] (UUID[]) | Yes | - | Participating agent IDs |

**Request Body**:

```json
{
  "title": "Implement dark mode",
  "type": "single",
  "projectId": "01929f5e-8a3c-7004-0001-000000000001",
  "agentIds": [
    "01929f5e-8a3c-7002-0001-000000000001"
  ]
}
```

**Response `200`**:

```json
{
  "code": 0,
  "data": {
    "id": "01929f5e-8a3c-7003-0001-000000000002",
    "userId": "01929f5e-8a3c-7001-0001-000000000001",
    "projectId": "01929f5e-8a3c-7004-0001-000000000001",
    "title": "Implement dark mode",
    "type": "single",
    "agentIds": [
      "01929f5e-8a3c-7002-0001-000000000001"
    ],
    "createdAt": "2026-06-02T14:30:00.000Z",
    "updatedAt": "2026-06-02T14:30:00.000Z"
  },
  "message": "success"
}
```

#### `GET /api/sessions/{sessionId}`

| Property | Value |
|----------|-------|
| Auth | `AUTHENTICATED` 🔒 |
| Description | Get session by ID (ownership verified via JWT `sub`) |

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| sessionId | string (UUID) | Target session ID |

**Response `200`**:

```json
{
  "code": 0,
  "data": {
    "id": "01929f5e-8a3c-7003-0001-000000000001",
    "userId": "01929f5e-8a3c-7001-0001-000000000001",
    "projectId": "01929f5e-8a3c-7004-0001-000000000001",
    "title": "Fix authentication bug",
    "type": "single",
    "agentIds": [
      "01929f5e-8a3c-7002-0001-000000000001"
    ],
    "createdAt": "2026-06-02T10:00:00.000Z",
    "updatedAt": "2026-06-02T14:30:00.000Z"
  },
  "message": "success"
}
```

**Response `404`**:

```json
{
  "code": 404,
  "data": null,
  "message": "Session not found",
  "error": {
    "errorCode": "SESSION_NOT_FOUND",
    "errorMessage": "The requested session does not exist or you do not have access.",
    "recoverable": false
  }
}
```

#### `PATCH /api/sessions/{sessionId}`

| Property | Value |
|----------|-------|
| Auth | `AUTHENTICATED` 🔒 |
| Description | Update session title (ownership verified via JWT `sub`) |

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| sessionId | string (UUID) | Target session ID |

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string (≤255) | Yes | New session title |

**Request Body**:

```json
{
  "title": "Fix authentication bug - RESOLVED"
}
```

**Response `200`**:

```json
{
  "code": 0,
  "data": {
    "id": "01929f5e-8a3c-7003-0001-000000000001",
    "userId": "01929f5e-8a3c-7001-0001-000000000001",
    "projectId": "01929f5e-8a3c-7004-0001-000000000001",
    "title": "Fix authentication bug - RESOLVED",
    "type": "single",
    "agentIds": [
      "01929f5e-8a3c-7002-0001-000000000001"
    ],
    "createdAt": "2026-06-02T10:00:00.000Z",
    "updatedAt": "2026-06-02T15:00:00.000Z"
  },
  "message": "success"
}
```

#### `DELETE /api/sessions/{sessionId}`

| Property | Value |
|----------|-------|
| Auth | `AUTHENTICATED` 🔒 |
| Description | Delete session (cascades to messages, ownership verified via JWT `sub`) |

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| sessionId | string (UUID) | Target session ID |

**Response `200`**:

```json
{
  "code": 0,
  "data": null,
  "message": "deleted"
}
```

---

### 4.5 Message Management

Base path: `/api/sessions/{sessionId}/messages`

#### `GET /api/sessions/{sessionId}/messages`

| Property | Value |
|----------|-------|
| Auth | `AUTHENTICATED` 🔒 |
| Description | List session messages with cursor-based pagination |

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| sessionId | string (UUID) | Target session ID |

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| cursor | string (UUID) | No | null | Cursor message ID (fetch messages before this ID) |
| limit | integer (1-100) | No | `50` | Maximum messages to return |

**Pagination Behavior**:
- Without `cursor`: Returns the most recent `limit` messages (newest first)
- With `cursor`: Returns `limit` messages older than the cursor message
- Response includes `hasMore` and `nextCursor` for pagination state

**Response `200`**:

```json
{
  "code": 0,
  "data": {
    "messages": [
      {
        "id": "01929f5e-8a3c-7005-0001-000000000003",
        "sessionId": "01929f5e-8a3c-7003-0001-000000000001",
        "senderType": "agent",
        "senderId": "01929f5e-8a3c-7002-0001-000000000001",
        "content": "I've analyzed the authentication flow and found the issue...",
        "contentType": "markdown",
        "cardData": null,
        "createdAt": "2026-06-02T14:35:00.000Z"
      },
      {
        "id": "01929f5e-8a3c-7005-0001-000000000002",
        "sessionId": "01929f5e-8a3c-7003-0001-000000000001",
        "senderType": "agent",
        "senderId": "01929f5e-8a3c-7002-0001-000000000001",
        "content": "Here's the fix with a code diff and preview:",
        "contentType": "card",
        "cardData": [
          {
            "type": "diffBlock",
            "content": {
              "filename": "src/auth/middleware.ts",
              "language": "typescript",
              "additions": 5,
              "deletions": 2,
              "hunks": [
                {
                  "oldStart": 15,
                  "oldLines": 4,
                  "newStart": 15,
                  "newLines": 7,
                  "content": "+import { verifyToken } from './jwt';\n+\n export async function authMiddleware(req: Request) {\n-  const token = req.headers.authorization;\n-  if (!token) throw new Error('Unauthorized');\n+  const authHeader = req.headers.authorization;\n+  if (!authHeader?.startsWith('Bearer ')) {\n+    throw new AuthError('INVALID_TOKEN', 'Missing or malformed Authorization header');\n+  }\n+  const token = authHeader.slice(7);\n+  return await verifyToken(token);\n }",
                  "oldContent": "export async function authMiddleware(req: Request) {\n  const token = req.headers.authorization;\n  if (!token) throw new Error('Unauthorized');\n}"
                }
              ],
              "status": "pending"
            }
          },
          {
            "type": "previewBlock",
            "content": {
              "html": "<div class=\"auth-form\"><h2>Login</h2><input type=\"text\" placeholder=\"Username\" /><input type=\"password\" placeholder=\"Password\" /><button>Submit</button></div>",
              "css": ".auth-form { max-width: 400px; margin: 100px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }",
              "js": "",
              "viewport": "desktop"
            }
          }
        ],
        "createdAt": "2026-06-02T14:36:00.000Z"
      },
      {
        "id": "01929f5e-8a3c-7005-0001-000000000001",
        "sessionId": "01929f5e-8a3c-7003-0001-000000000001",
        "senderType": "user",
        "senderId": "01929f5e-8a3c-7001-0001-000000000001",
        "content": "The login page is not working after the latest deploy. Can you investigate?",
        "contentType": "text",
        "cardData": null,
        "createdAt": "2026-06-02T14:30:00.000Z"
      }
    ],
    "hasMore": true,
    "nextCursor": "01929f5e-8a3c-7005-0001-000000000001"
  },
  "message": "success"
}
```

**Response `200` (Last Page)**:

```json
{
  "code": 0,
  "data": {
    "messages": [
      {
        "id": "01929f5e-8a3c-7005-0001-000000000001",
        "sessionId": "01929f5e-8a3c-7003-0001-000000000001",
        "senderType": "user",
        "senderId": "01929f5e-8a3c-7001-0001-000000000001",
        "content": "The login page is not working after the latest deploy. Can you investigate?",
        "contentType": "text",
        "cardData": null,
        "createdAt": "2026-06-02T14:30:00.000Z"
      }
    ],
    "hasMore": false,
    "nextCursor": null
  },
  "message": "success"
}
```

**Response `404`**:

```json
{
  "code": 404,
  "data": null,
  "message": "Session not found",
  "error": {
    "errorCode": "SESSION_NOT_FOUND",
    "errorMessage": "The requested session does not exist.",
    "recoverable": false
  }
}
```

---

## 5. WebSocket Protocol

### 5.1 Connection & Multiplexing

```
ws://localhost:8000/ws?token={jwt}
```

> **Breaking Change (v2.2)**: The `session_id` handshake parameter has been **removed**. A single WebSocket connection now serves as a **multiplexed channel** for all sessions owned by the authenticated user. This eliminates the per-session FD (file descriptor) pressure on the server — a user with 50 open sessions no longer requires 50 concurrent WebSocket connections.

**Connection Lifecycle**:
1. Client initiates WebSocket handshake with `token` query parameter only
2. Server validates JWT, extracts `userId`
3. On success: `HTTP 101 Switching Protocols` — connection established with **zero active sessions**
4. Client MUST send `joinSession` to activate a session context before any session-scoped operation
5. Client MAY send `leaveSession` to deactivate a session context (frees server-side subscription)
6. Client MAY send multiple `joinSession` to subscribe to multiple sessions concurrently
7. On disconnect: all session subscriptions are automatically cleaned up

**Session Subscription Model**:
```
Client                                Server
  |                                     |
  |--- ws connect (token=jwt) -------->|  Connection established, 0 sessions
  |                                     |
  |--- joinSession {sessionId: A} ---->|  Subscribe to session A
  |<-- sessionJoined {sessionId: A} ---|  Acknowledged
  |                                     |
  |--- joinSession {sessionId: B} ---->|  Subscribe to session A+B
  |<-- sessionJoined {sessionId: B} ---|  Acknowledged
  |                                     |
  |--- sendMessage {sessionId: A} ---->|  Message routed to session A
  |<-- messageAck {sessionId: A} -----|
  |<-- messageChunk {sessionId: A} ---|  Stream from session A
  |<-- messageComplete {sessionId: A} |  Finalized
  |                                     |
  |--- leaveSession {sessionId: A} --->|  Unsubscribe from session A
  |<-- sessionLeft {sessionId: A} ----|  Acknowledged
  |                                     |
  |--- sendMessage {sessionId: B} ---->|  Message routed to session B
  |<-- messageAck {sessionId: B} -----|
  |<-- messageComplete {sessionId: B} |  Finalized
```

**Reconnection Strategy**:
- Client MUST implement exponential backoff: 1s → 2s → 4s → 8s → 16s (max)
- On close code `1000`: Do not reconnect (intentional)
- On close codes `4001/4003`: Do not reconnect (auth failure, require re-login)
- On all other codes: Reconnect with backoff, then re-issue `joinSession` for all previously active sessions

### 5.2 Message Frame Structure

All WebSocket messages (both C2S and S2C) follow this envelope:

```typescript
interface WSFrame {
  type: string;           // Message type discriminator
  timestamp: string;      // ISO 8601 timestamp
  payload?: object;       // Type-specific payload (optional for ping/pong)
}
```

### 5.3 Client-to-Server (C2S) Messages

#### 5.3.1 `ping` — Heartbeat

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'ping'` | Yes | Message type discriminator |
| timestamp | string (ISO 8601) | Yes | Client send timestamp |

**Mock**:

```json
{
  "type": "ping",
  "timestamp": "2026-06-02T14:30:00.000Z"
}
```

**Server Response**: `pong` (see [5.4.1](#541-pong--heartbeat-response))

#### 5.3.2 `joinSession` — Subscribe to Session

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'joinSession'` | Yes | Message type discriminator |
| timestamp | string (ISO 8601) | Yes | Client send timestamp |
| payload | object | Yes | Session subscription payload |

**payload**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| sessionId | string (UUID) | Yes | Session ID to subscribe to |

> The server MUST verify that the session belongs to the authenticated user (`JWT.sub === session.userId`). On success, the server pushes all subsequent events for that session (agentStatus, messageChunk, messageComplete, etc.) over this connection. On failure, the server replies with `sessionJoinError`.

**Mock**:

```json
{
  "type": "joinSession",
  "timestamp": "2026-06-02T14:30:00.000Z",
  "payload": {
    "sessionId": "01929f5e-8a3c-7003-0001-000000000001"
  }
}
```

**Server Response**: `sessionJoined` (see [5.4.2](#542-sessionjoined--session-subscription-acknowledged))

#### 5.3.3 `leaveSession` — Unsubscribe from Session

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'leaveSession'` | Yes | Message type discriminator |
| timestamp | string (ISO 8601) | Yes | Client send timestamp |
| payload | object | Yes | Session unsubscription payload |

**payload**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| sessionId | string (UUID) | Yes | Session ID to unsubscribe from |

**Mock**:

```json
{
  "type": "leaveSession",
  "timestamp": "2026-06-02T14:35:00.000Z",
  "payload": {
    "sessionId": "01929f5e-8a3c-7003-0001-000000000001"
  }
}
```

**Server Response**: `sessionLeft` (see [5.4.3](#543-sessionleft--session-unsubscription-acknowledged))

#### 5.3.4 `sendMessage` — Send User Message

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'sendMessage'` | Yes | Message type discriminator |
| timestamp | string (ISO 8601) | Yes | Client send timestamp |
| payload | object | Yes | Message payload |

**payload**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| sessionId | string (UUID) | Yes | Target session ID |
| clientMessageId | string (UUID) | Yes | **Client-generated UUID for optimistic UI binding and deduplication** |
| content | string (≥1 char) | Yes | User message content |

> **Breaking Change (v2.0)**: `clientMessageId` is now mandatory. The client MUST generate a UUIDv7 before sending and use it to:
> 1. Immediately render the message bubble with `status: 'sending'`
> 2. Bind the server-acknowledged `messageId` via `messageAck` (within 50ms) to stabilize optimistic UI
> 3. Deduplicate if the same `clientMessageId` appears in multiple `messageComplete` events

**Mock (Success)**:

```json
{
  "type": "sendMessage",
  "timestamp": "2026-06-02T14:30:00.000Z",
  "payload": {
    "sessionId": "01929f5e-8a3c-7003-0001-000000000001",
    "clientMessageId": "01929f5e-8a3c-7006-0001-000000000001",
    "content": "Please help me fix the authentication middleware"
  }
}
```

**Server Processing Flow**:
1. Validate message schema + verify `sessionId` is currently joined via `joinSession`
2. Persist user message to database (generating server `messageId`)
3. **Immediately** push `messageAck` with `{ clientMessageId, messageId }` — SLA: ≤50ms from receipt
4. Push `agentStatus: { taskStatus: 'analyzing' }`
5. Invoke Orchestrator → stream `messageChunk` events
6. Push `messageComplete` with full `Message` entity

#### 5.3.5 `triggerAction` — Trigger Card Action

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'triggerAction'` | Yes | Message type discriminator |
| timestamp | string (ISO 8601) | Yes | Client send timestamp |
| payload | object | Yes | Action payload |

**payload**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| messageId | string (UUID) | Yes | Target message ID containing the card |
| actionType | `'applyDiff'` \| `'retry'` \| `'pin'` | Yes | Action type |
| payload | object | No | Action-specific parameters |

**Mock (applyDiff)**:

```json
{
  "type": "triggerAction",
  "timestamp": "2026-06-02T14:40:00.000Z",
  "payload": {
    "messageId": "01929f5e-8a3c-7005-0001-000000000002",
    "actionType": "applyDiff",
    "payload": {}
  }
}
```

**Server Processing Flow**:
1. Validate message schema
2. Verify `messageId` belongs to a session currently joined by this connection
3. Extract `cardData` from message
4. Execute action (e.g., apply diff to file)
5. Push `actionStatus: { status: 'applying' }`
6. Push `actionResult: { status: 'applied' | 'rejected' }`

---

### 5.4 Server-to-Client (S2C) Messages

#### 5.4.1 `pong` — Heartbeat Response

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'pong'` | Yes | Message type discriminator |
| timestamp | string (ISO 8601) | Yes | Server response timestamp |

**Mock**:

```json
{
  "type": "pong",
  "timestamp": "2026-06-02T14:30:00.050Z"
}
```

#### 5.4.2 `sessionJoined` — Session Subscription Acknowledged

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'sessionJoined'` | Yes | Message type discriminator |
| timestamp | string (ISO 8601) | Yes | Server push timestamp |
| payload | object | Yes | Subscription confirmation |

**payload**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| sessionId | string (UUID) | Yes | Subscribed session ID |

**Mock**:

```json
{
  "type": "sessionJoined",
  "timestamp": "2026-06-02T14:30:00.100Z",
  "payload": {
    "sessionId": "01929f5e-8a3c-7003-0001-000000000001"
  }
}
```

**Error Case — `sessionJoinError`**:

```json
{
  "type": "sessionJoinError",
  "timestamp": "2026-06-02T14:30:00.100Z",
  "payload": {
    "sessionId": "01929f5e-8a3c-7003-0001-000000000099",
    "errorCode": "SESSION_NOT_FOUND",
    "errorMessage": "The requested session does not exist or you do not have access.",
    "recoverable": false
  }
}
```

#### 5.4.3 `sessionLeft` — Session Unsubscription Acknowledged

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'sessionLeft'` | Yes | Message type discriminator |
| timestamp | string (ISO 8601) | Yes | Server push timestamp |
| payload | object | Yes | Unsubscription confirmation |

**payload**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| sessionId | string (UUID) | Yes | Unsubscribed session ID |

**Mock**:

```json
{
  "type": "sessionLeft",
  "timestamp": "2026-06-02T14:35:00.050Z",
  "payload": {
    "sessionId": "01929f5e-8a3c-7003-0001-000000000001"
  }
}
```

#### 5.4.4 `messageAck` — Message Persistence Acknowledgment

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'messageAck'` | Yes | Message type discriminator |
| timestamp | string (ISO 8601) | Yes | Server push timestamp |
| payload | object | Yes | Acknowledgment payload |

**payload**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| sessionId | string (UUID) | Yes | Session context |
| clientMessageId | string (UUID) | Yes | Client-generated UUID from the original `sendMessage` |
| messageId | string (UUID) | Yes | Server-generated UUID after database persistence |

> **SLA**: The server MUST emit `messageAck` within **50ms** of receiving `sendMessage`. This guarantees the frontend can stabilize the optimistic UI bubble (transition from `sending` → `sent` and bind the server `messageId`) **before** the LLM blocks on inference. Without this ACK, a slow LLM startup would leave the user's message bubble in a perpetual "sending" spinner.
>
> **Binding Contract**: Upon receiving `messageAck`, the client MUST:
> 1. Match `clientMessageId` with the local optimistic message
> 2. Attach the server `messageId` to the local message for subsequent `messageChunk` / `messageComplete` correlation
> 3. Transition message status: `'sending'` → `'sent'`

**Mock**:

```json
{
  "type": "messageAck",
  "timestamp": "2026-06-02T14:30:00.030Z",
  "payload": {
    "sessionId": "01929f5e-8a3c-7003-0001-000000000001",
    "clientMessageId": "01929f5e-8a3c-7006-0001-000000000001",
    "messageId": "01929f5e-8a3c-7005-0001-000000000004"
  }
}
```

#### 5.4.5 `agentStatus` — Agent Status Update

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'agentStatus'` | Yes | Message type discriminator |
| timestamp | string (ISO 8601) | Yes | Server push timestamp |
| payload | object | Yes | Status payload |

**payload**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| sessionId | string (UUID) | Yes | Session context |
| agentId | string (UUID) | Yes | Agent reporting status |
| connectionStatus | `'online'` \| `'offline'` \| `'busy'` | No | Network-layer status (if changed) |
| taskStatus | `'idle'` \| `'analyzing'` \| `'executing'` \| `'completed'` \| `'failed'` | Yes | Execution-layer status |
| displayText | string | Yes | Human-readable status message |

> **Breaking Change (v2.0)**: The `status` field has been split into `connectionStatus` and `taskStatus` to match the AgentProfile entity decomposition.

**Mock (Analyzing)**:

```json
{
  "type": "agentStatus",
  "timestamp": "2026-06-02T14:30:01.000Z",
  "payload": {
    "sessionId": "01929f5e-8a3c-7003-0001-000000000001",
    "agentId": "01929f5e-8a3c-7002-0001-000000000001",
    "connectionStatus": "online",
    "taskStatus": "analyzing",
    "displayText": "Analyzing your request..."
  }
}
```

**Mock (Executing)**:

```json
{
  "type": "agentStatus",
  "timestamp": "2026-06-02T14:30:03.000Z",
  "payload": {
    "sessionId": "01929f5e-8a3c-7003-0001-000000000001",
    "agentId": "01929f5e-8a3c-7002-0001-000000000001",
    "taskStatus": "executing",
    "displayText": "Generating code changes..."
  }
}
```

**Mock (Completed)**:

```json
{
  "type": "agentStatus",
  "timestamp": "2026-06-02T14:30:15.000Z",
  "payload": {
    "sessionId": "01929f5e-8a3c-7003-0001-000000000001",
    "agentId": "01929f5e-8a3c-7002-0001-000000000001",
    "taskStatus": "completed",
    "displayText": "Done! Here's the fix."
  }
}
```

#### 5.4.6 `messageChunk` — Streaming Message Chunk

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'messageChunk'` | Yes | Message type discriminator |
| timestamp | string (ISO 8601) | Yes | Server push timestamp |
| payload | object | Yes | Chunk payload |

**payload**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| messageId | string (UUID) | Yes | Server-assigned message ID for chunk assembly |
| clientMessageId | string (UUID) | No | Original client-generated ID (for binding to optimistic UI) |
| sessionId | string (UUID) | Yes | Session context |
| agentId | string (UUID) | Yes | Agent generating this chunk |
| chunkType | `'text'` \| `'code_diff'` \| `'web_preview'` \| `'deploy_status'` | Yes | Content type for frontend rendering dispatch |
| deltaContent | string | Yes | Incremental text content for this chunk |
| sequence | integer (≥0) | Yes | **Monotonically increasing sequence number for guaranteed ordering** |

> **Breaking Change (v2.1)**: `isFinal` has been **removed** from `messageChunk`. The `messageComplete` event is the **sole authoritative signal** for stream termination. Clients MUST NOT use any field within `messageChunk` to determine stream completion. This eliminates the race condition where `isFinal: true` arrives but `messageComplete` is delayed, causing premature UI state transitions.
>
> `chunkIndex` has been **removed** in favor of `sequence`. The `sequence` field is:
> - Monotonically increasing across all messages in a session
> - Never reset or reused
> - Guaranteed to reflect the exact order of generation

**Mock (Text Chunk #1)**:

```json
{
  "type": "messageChunk",
  "timestamp": "2026-06-02T14:30:02.000Z",
  "payload": {
    "messageId": "01929f5e-8a3c-7005-0001-000000000002",
    "clientMessageId": "01929f5e-8a3c-7006-0001-000000000001",
    "sessionId": "01929f5e-8a3c-7003-0001-000000000001",
    "agentId": "01929f5e-8a3c-7002-0001-000000000001",
    "chunkType": "text",
    "deltaContent": "I've analyzed the authentication flow and found the issue. ",
    "sequence": 0
  }
}
```

**Mock (Text Chunk #2)**:

```json
{
  "type": "messageChunk",
  "timestamp": "2026-06-02T14:30:02.500Z",
  "payload": {
    "messageId": "01929f5e-8a3c-7005-0001-000000000002",
    "clientMessageId": "01929f5e-8a3c-7006-0001-000000000001",
    "sessionId": "01929f5e-8a3c-7003-0001-000000000001",
    "agentId": "01929f5e-8a3c-7002-0001-000000000001",
    "chunkType": "text",
    "deltaContent": "The middleware is not properly validating the Bearer token format.",
    "sequence": 1
  }
}
```

**Client Reassembly Algorithm**:
```
1. On `messageChunk` arrival:
   a. Buffer chunk by (messageId + clientMessageId)
   b. Sort buffer by `sequence` ascending
   c. Concatenate `deltaContent` in sequence order
   d. Append to live streaming UI (do NOT finalize)
   e. If out-of-order chunks detected (sequence gap), buffer and wait
   f. If timeout (>5s gap), request resend via `triggerAction({ actionType: 'retry' })`

2. On `messageComplete` arrival:
   a. Discard chunk buffer for this messageId
   b. Replace streaming content with server-confirmed `payload.content`
   c. Render final cardData if present
   d. Stop loading animation
   e. Update optimistic UI: message status → 'sent'
```

#### 5.4.7 `messageComplete` — Message Finalization

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'messageComplete'` | Yes | Message type discriminator |
| timestamp | string (ISO 8601) | Yes | Server push timestamp |
| payload | [Message](#24-message) | Yes | Complete Message entity |

> **SOLE STREAM TERMINATOR**: `messageComplete` is the **only** event that signals the end of a message stream. The client MUST NOT rely on any chunk-level field (including sequence gaps, timeouts, or heuristics) to determine stream completion. Upon receiving `messageComplete`, the client MUST:
> 1. Discard the streaming chunk buffer for this `messageId`
> 2. Replace streamed content with the authoritative `payload.content`
> 3. Stop all loading indicators
> 4. Transition optimistic UI to confirmed state

**Mock (Text Message)**:

```json
{
  "type": "messageComplete",
  "timestamp": "2026-06-02T14:30:15.000Z",
  "payload": {
    "id": "01929f5e-8a3c-7005-0001-000000000002",
    "sessionId": "01929f5e-8a3c-7003-0001-000000000001",
    "senderType": "agent",
    "senderId": "01929f5e-8a3c-7002-0001-000000000001",
    "content": "I've analyzed the authentication flow and found the issue. The middleware is not properly validating the Bearer token format.",
    "contentType": "markdown",
    "cardData": null,
    "createdAt": "2026-06-02T14:30:15.000Z"
  }
}
```

**Mock (Card Message with Diff + Preview)**:

```json
{
  "type": "messageComplete",
  "timestamp": "2026-06-02T14:36:00.000Z",
  "payload": {
    "id": "01929f5e-8a3c-7005-0001-000000000003",
    "sessionId": "01929f5e-8a3c-7003-0001-000000000001",
    "senderType": "agent",
    "senderId": "01929f5e-8a3c-7002-0001-000000000001",
    "content": "Here's the fix with a code diff and preview:",
    "contentType": "card",
    "cardData": [
      {
        "type": "diffBlock",
        "content": {
          "filename": "src/auth/middleware.ts",
          "language": "typescript",
          "additions": 5,
          "deletions": 2,
          "hunks": [
            {
              "oldStart": 15,
              "oldLines": 4,
              "newStart": 15,
              "newLines": 7,
              "content": "+import { verifyToken } from './jwt';\n+\n export async function authMiddleware(req: Request) {\n-  const token = req.headers.authorization;\n-  if (!token) throw new Error('Unauthorized');\n+  const authHeader = req.headers.authorization;\n+  if (!authHeader?.startsWith('Bearer ')) {\n+    throw new AuthError('INVALID_TOKEN', 'Missing or malformed Authorization header');\n+  }\n+  const token = authHeader.slice(7);\n+  return await verifyToken(token);\n }",
              "oldContent": "export async function authMiddleware(req: Request) {\n  const token = req.headers.authorization;\n  if (!token) throw new Error('Unauthorized');\n}"
            }
          ],
          "status": "pending"
        }
      },
      {
        "type": "previewBlock",
        "content": {
          "html": "<div class=\"auth-form\"><h2>Login</h2><input type=\"text\" placeholder=\"Username\" /><input type=\"password\" placeholder=\"Password\" /><button>Submit</button></div>",
          "css": ".auth-form { max-width: 400px; margin: 100px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }",
          "js": "",
          "viewport": "desktop"
        }
      }
    ],
    "createdAt": "2026-06-02T14:36:00.000Z"
  }
}
```

**Client-Side Binding Logic**:
```
1. Match payload.id with previously received messageComplete.id OR
2. Match with clientMessageId from sendMessage (optimistic UI binding)
3. Replace local optimistic message with server-confirmed entity
4. Update message status from 'sending' → 'sent'
```

#### 5.4.8 `actionStatus` — Action Execution Status

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'actionStatus'` | Yes | Message type discriminator |
| timestamp | string (ISO 8601) | Yes | Server push timestamp |
| payload | object | Yes | Action status payload |

**payload**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| sessionId | string (UUID) | Yes | Session context |
| messageId | string (UUID) | Yes | Target message ID |
| actionType | `'applyDiff'` \| `'retry'` \| `'pin'` | Yes | Action being executed |
| status | `'applying'` \| `'retrying'` | Yes | Current execution status |

**Mock**:

```json
{
  "type": "actionStatus",
  "timestamp": "2026-06-02T14:40:01.000Z",
  "payload": {
    "sessionId": "01929f5e-8a3c-7003-0001-000000000001",
    "messageId": "01929f5e-8a3c-7005-0001-000000000002",
    "actionType": "applyDiff",
    "status": "applying"
  }
}
```

#### 5.4.9 `actionResult` — Action Execution Result

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'actionResult'` | Yes | Message type discriminator |
| timestamp | string (ISO 8601) | Yes | Server push timestamp |
| payload | object | Yes | Action result payload |

**payload**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| sessionId | string (UUID) | Yes | Session context |
| messageId | string (UUID) | Yes | Target message ID |
| actionType | `'applyDiff'` \| `'retry'` \| `'pin'` | Yes | Action that was executed |
| status | `'applied'` \| `'rejected'` \| `'failed'` | Yes | Final action status |
| detail | string | No | Human-readable result description |

**Mock (Success)**:

```json
{
  "type": "actionResult",
  "timestamp": "2026-06-02T14:40:02.000Z",
  "payload": {
    "sessionId": "01929f5e-8a3c-7003-0001-000000000001",
    "messageId": "01929f5e-8a3c-7005-0001-000000000002",
    "actionType": "applyDiff",
    "status": "applied",
    "detail": "Successfully applied 1 hunk to src/auth/middleware.ts"
  }
}
```

**Mock (Rejected - Conflict)**:

```json
{
  "type": "actionResult",
  "timestamp": "2026-06-02T14:40:02.000Z",
  "payload": {
    "sessionId": "01929f5e-8a3c-7003-0001-000000000001",
    "messageId": "01929f5e-8a3c-7005-0001-000000000002",
    "actionType": "applyDiff",
    "status": "rejected",
    "detail": "Conflict: file src/auth/middleware.ts has been modified since the diff was generated"
  }
}
```

#### 5.4.10 `error` — Server Error

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | `'error'` | Yes | Message type discriminator |
| timestamp | string (ISO 8601) | Yes | Server push timestamp |
| payload | object | Yes | Error payload |

**payload**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| sessionId | string (UUID) | Yes | Session context where error occurred |
| errorCode | string | Yes | Machine-readable error code (UPPER_SNAKE_CASE) |
| errorMessage | string | Yes | Human-readable frontend display text |
| recoverable | boolean | Yes | Whether client can retry the operation |

**Mock (Timeout)**:

```json
{
  "type": "error",
  "timestamp": "2026-06-02T14:30:30.000Z",
  "payload": {
    "sessionId": "01929f5e-8a3c-7003-0001-000000000001",
    "errorCode": "TIMEOUT",
    "errorMessage": "The request timed out. Please try again.",
    "recoverable": true
  }
}
```

**Mock (LLM Provider Error)**:

```json
{
  "type": "error",
  "timestamp": "2026-06-02T14:30:30.000Z",
  "payload": {
    "sessionId": "01929f5e-8a3c-7003-0001-000000000001",
    "errorCode": "LLM_PROVIDER_ERROR",
    "errorMessage": "The AI service is temporarily unavailable. Please try again in a few moments.",
    "recoverable": true
  }
}
```

**Mock (Session Ownership Mismatch)**:

```json
{
  "type": "error",
  "timestamp": "2026-06-02T14:30:30.000Z",
  "payload": {
    "sessionId": "01929f5e-8a3c-7003-0001-000000000001",
    "errorCode": "SESSION_FORBIDDEN",
    "errorMessage": "You do not have access to this session.",
    "recoverable": false
  }
}
```

---

## 6. Error Code Registry

All error codes use **UPPER_SNAKE_CASE** format. Frontend MUST use `errorMessage` for user-facing display and `errorCode` for programmatic branching.

### 6.1 General Errors

| Error Code | HTTP Status | Recoverable | Description |
|------------|-------------|-------------|-------------|
| `UNKNOWN_ERROR` | 500 | `false` | Unhandled server exception |
| `INVALID_REQUEST` | 400 | `false` | Malformed request body or parameters |
| `UNAUTHORIZED` | 401 | `false` | Missing or invalid authentication |
| `FORBIDDEN` | 403 | `false` | Insufficient permissions |
| `NOT_FOUND` | 404 | `false` | Generic resource not found |
| `RATE_LIMITED` | 429 | `true` | Too many requests, retry after cooldown |
| `TIMEOUT` | 504 | `true` | Operation timed out |
| `CONNECTION_ERROR` | 502 | `true` | Upstream connection failure |

### 6.2 User Errors

| Error Code | HTTP Status | Recoverable | Description |
|------------|-------------|-------------|-------------|
| `USER_NOT_FOUND` | 404 | `false` | User ID does not exist |
| `USER_DUPLICATE_USERNAME` | 400 | `false` | Username already taken |
| `USER_DUPLICATE_EMAIL` | 400 | `false` | Email already registered |

### 6.3 Agent Errors

| Error Code | HTTP Status | Recoverable | Description |
|------------|-------------|-------------|-------------|
| `AGENT_NOT_FOUND` | 404 | `false` | Agent ID does not exist |
| `AGENT_ADAPTER_ERROR` | 502 | `true` | LLM adapter initialization failed |
| `AGENT_QUOTA_EXCEEDED` | 429 | `true` | Agent usage quota exceeded |

### 6.4 Session Errors

| Error Code | HTTP Status | Recoverable | Description |
|------------|-------------|-------------|-------------|
| `SESSION_NOT_FOUND` | 404 | `false` | Session ID does not exist |
| `SESSION_FORBIDDEN` | 403 | `false` | User does not own this session |
| `SESSION_LIMIT_EXCEEDED` | 429 | `false` | Maximum sessions per project exceeded |

### 6.5 Message Errors

| Error Code | HTTP Status | Recoverable | Description |
|------------|-------------|-------------|-------------|
| `MESSAGE_NOT_FOUND` | 404 | `false` | Message ID does not exist |
| `MESSAGE_FORBIDDEN` | 403 | `false` | Message does not belong to current session |
| `MESSAGE_EMPTY_CONTENT` | 400 | `false` | Message content is empty or whitespace-only |

### 6.6 Action Errors

| Error Code | HTTP Status | Recoverable | Description |
|------------|-------------|-------------|-------------|
| `ACTION_INVALID_TYPE` | 400 | `false` | Unsupported action type |
| `ACTION_DIFF_CONFLICT` | 409 | `true` | Target file modified since diff generation |
| `ACTION_DIFF_APPLY_FAILED` | 500 | `true` | Failed to apply diff (merge conflict) |
| `ACTION_CARD_NOT_FOUND` | 404 | `false` | Target message has no cardData |

### 6.7 LLM Provider Errors

| Error Code | HTTP Status | Recoverable | Description |
|------------|-------------|-------------|-------------|
| `LLM_PROVIDER_ERROR` | 502 | `true` | Upstream LLM API error |
| `LLM_RATE_LIMITED` | 429 | `true` | LLM provider rate limit hit |
| `LLM_CONTEXT_LENGTH_EXCEEDED` | 400 | `false` | Input exceeds model context window |
| `LLM_CONTENT_FILTERED` | 400 | `false` | Content blocked by safety filters |

### 6.8 WebSocket-Specific Errors

| Error Code | Close Code | Recoverable | Description |
|------------|------------|-------------|-------------|
| `WS_AUTH_FAILED` | `4001` | `false` | JWT validation failed |
| `WS_SESSION_NOT_FOUND` | `4004` | `false` | Session does not exist |
| `WS_SESSION_FORBIDDEN` | `4003` | `false` | Session ownership mismatch |
| `WS_SESSION_NOT_JOINED` | `4005` | `false` | `sendMessage`/`triggerAction` on a session not yet joined via `joinSession` |
| `WS_IDLE_TIMEOUT` | `4008` | `true` | Server closed idle connection |
| `WS_MESSAGE_TOO_LARGE` | `4009` | `false` | Message exceeds 1MB limit |
| `WS_INVALID_FRAME` | `4003` | `false` | Malformed WebSocket message frame |

---

## Appendix A: Migration Guide (v1 → v2.2)

### A.1 Entity Changes

| Entity | Field | v1 | v2.2 | Migration Action |
|--------|-------|----|------|------------------|
| `Session` | `projectId` | Missing | Required (UUID) | Add column, backfill from project lookup |
| `AgentProfile` | `status` | Single field | Split to `connectionStatus` + `taskStatus` | Add columns, migrate existing values |
| `Message` | `cardData` | Flat object | `Array<CardBlock>` | Transform existing data |
| `AgentConfig` | `tools` | `object[]` | `ToolDefinition[]` | Validate against JSON Schema spec |
| `AgentConfig` | `mcpServers` | `object[]` | `MCPServerConfig[]` | Validate against MCP stdio spec |
| `AgentConfig` | `apiKey` | Returned in responses | **WRITE-ONLY / stripped from all responses** | Remove from response DTOs |

### A.2 WebSocket Changes

| Message | Field | v1 | v2.2 | Migration Action |
|---------|-------|----|------|------------------|
| Handshake | `session_id` | Required query param | **Removed** | Remove from WS URL; use `joinSession` instead |
| Handshake | `token` | Query param | Query param (sole auth) | Keep as-is |
| C2S | `joinSession` | Missing | **New** | Implement session subscription before any session-scoped operation |
| C2S | `leaveSession` | Missing | **New** | Implement session unsubscription |
| C2S | `sendMessage` | `clientMessageId` absent | Required (UUID) | Client-side: generate UUID before send |
| S2C | `sessionJoined` | Missing | **New** | Handle subscription acknowledgment |
| S2C | `sessionLeft` | Missing | **New** | Handle unsubscription acknowledgment |
| S2C | `messageAck` | Missing | **New** | Handle ACK to stabilize optimistic UI within 50ms |
| S2C | `messageChunk` | `isFinal` present | **Removed** | Use `messageComplete` as sole terminator |
| S2C | `messageChunk` | `chunkIndex` present | **Removed** | Use `sequence` for ordering |
| S2C | `agentStatus` | Single `status` | `connectionStatus` + `taskStatus` | Split status reporting |

### A.3 REST API Changes

| Endpoint | Change | Migration Action |
|----------|--------|------------------|
| Session routes | `/api/users/{userId}/sessions/*` → `/api/sessions/*` | Update all route paths; remove `userId` from URL |
| `PATCH /api/agents/:id` | `connectionStatus`/`taskStatus` removed from writable fields | Remove from frontend form submission |
| `GET /api/agents*` | `apiKey` stripped from `agentConfig` response | Remove any frontend code that reads `apiKey` from responses |
| `GET /api/sessions/:id/messages` | Response wrapped in `{ messages, hasMore, nextCursor }` | Update frontend pagination logic |
| Error responses | `{ ..., errorCode, errorMessage }` → `{ ..., error: AppError }` | Update error deserialization to `response.error` |
| All session routes | Auth level: `OWNER 🔐` → `AUTHENTICATED 🔒` | userId derived from JWT `sub` only |

### A.4 Breaking Changes Checklist

- [ ] Add `projectId` column to `sessions` table
- [ ] Split `status` column in `agent_profiles` table
- [ ] Transform `cardData` from object to array format
- [ ] Validate `tools` against `ToolDefinition` schema
- [ ] Validate `mcpServers` against `MCPServerConfig` schema
- [ ] Strip `apiKey` from all REST response DTOs (AgentConfig serialization)
- [ ] Remove `session_id` from WebSocket handshake URL
- [ ] Implement `joinSession`/`leaveSession` C2S handlers on server
- [ ] Implement `sessionJoined`/`sessionLeft`/`sessionJoinError` S2C push on server
- [ ] Implement `messageAck` S2C push (≤50ms SLA) on server
- [ ] Implement `joinSession`/`leaveSession` client-side with reconnection replay
- [ ] Handle `messageAck` to stabilize optimistic UI before LLM response
- [ ] Update `sendMessage` client code to include `clientMessageId`
- [ ] Update `messageChunk` handler to use `sequence` only
- [ ] Remove `isFinal`/`chunkIndex` references from chunk processing code
- [ ] Update stream completion logic to rely solely on `messageComplete`
- [ ] Flatten session routes from `/api/users/:id/sessions` to `/api/sessions`
- [ ] Remove `connectionStatus`/`taskStatus` from agent PATCH forms
- [ ] Update message list pagination to use new response structure
- [ ] Implement JWT authentication middleware
- [ ] Update all error handling to extract `AppError` from `response.error`
- [ ] Update WebSocket error handling to use shared `AppError` type