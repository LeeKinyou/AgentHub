# AgentHub - 系统架构与通信规范

> 文档版本：v1.1
> 最后更新：2026-06-08
> 架构约束：严格遵循 `.traerules` 硬性约束

---

## 1. Monorepo 物理依赖拓扑 (Physical Architecture)

### 1.1 三层拓扑边界定义

```
┌─────────────────────────────────────────────────────────────────┐
│                        frontend/                                │
│  Next.js (App Router) + TypeScript + TailwindCSS                │
│  ─────────────────────────────────────────────────────────────  │
│  依赖：shared/ (workspace 协议引入)                              │
│  禁止：越权访问 backend/                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        shared/                                  │
│  SSOT (Single Source of Truth) 契约层                            │
│  ─────────────────────────────────────────────────────────────  │
│  输出：JSON Schema → 自动生成 TypeScript / Python 类型           │
│  禁止：依赖 frontend/ 或 backend/                                │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────────┐
│                        backend/                                 │
│  FastAPI + Python + LangGraph                                   │
│  ─────────────────────────────────────────────────────────────  │
│  依赖：通过 scripts/sync_schemas.py 同步 shared/ 模型            │
│  禁止：越权访问 frontend/                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 依赖边界硬约束

| 层级 | 目录 | 允许依赖 | 禁止依赖 |
|------|------|----------|----------|
| 契约层 | `shared/` | 无（零依赖） | `frontend/`、`backend/` |
| 展现层 | `frontend/` | `shared/` | `backend/` |
| 服务层 | `backend/` | `shared/` (同步) | `frontend/` |

### 1.3 物理目录结构

```
AgentHub/
├── shared/                      # 契约层 (SSOT)
│   ├── schemas/
│   │   ├── entities.json        # 核心实体 Schema (Session, Agent, Message)
│   │   └── ws_messages.json     # WebSocket 报文 Schema
│   ├── scripts/
│   │   └── codegen.js           # JSON Schema → TS/Python 类型生成器
│   └── index.ts                 # 导出入口
│
├── frontend/                    # 展现层
│   └── src/
│       └── components/
│           └── ui/              # Shadcn UI 原子组件
│
└── backend/                     # 服务层
    ├── alembic.ini              # Alembic 数据库迁移配置
    ├── alembic/                 # 迁移脚本目录（async 支持）
    └── app/
        ├── agents/
        │   ├── base_adapter.py  # Agent 统一适配器抽象基类
        │   ├── orchestrator.py  # 主编排器
        │   └── providers/       # 派生适配器实现
        │       ├── claude_code.py
        │       ├── codex.py
        │       └── opencode.py
        ├── core/
        │   ├── auth.py          # JWT + bcrypt 认证工具
        │   ├── redis.py         # 异步 Redis 客户端
        │   ├── database.py      # SQLAlchemy async session
        │   ├── config.py        # 环境配置
        │   └── exception_handler.py  # 全局异常拦截器
        ├── models/              # SQLAlchemy ORM 模型
        ├── schemas/             # Pydantic v2 请求/响应 Schema
        │   └── ws.py            # WebSocket S2C/C2C 类型化模型
        ├── routes/              # FastAPI 路由
        │   ├── auth.py          # 认证路由 (register/login/refresh/logout)
        │   ├── sessions.py      # 会话 CRUD
        │   ├── messages.py      # 消息历史
        │   ├── agents.py        # Agent 市场
        │   └── websocket.py     # WebSocket 端点 + SessionGuard
        └── main.py              # FastAPI 入口
```

### 1.4 契约优先开发流程 (Contract-First Workflow)

> **硬性规则**：所有实体字段变更必须先改 `shared/schemas/`，再改后端/前端实现，严禁反向操作。

```
shared/schemas/entities.json  ──►  后端 SQLAlchemy 模型 + Pydantic Schema
                      │
                      └──►  前端 TypeScript 类型 (codegen 自动生成)
```

**开发步骤**：
1. 在 `shared/schemas/entities.json` 中定义/修改实体字段
2. 在 `shared/schemas/ws_messages.json` 中定义/修改 WebSocket 报文
3. 运行 `scripts/codegen.js` 自动生成 TypeScript 类型
4. 后端同步修改 SQLAlchemy 模型 + Pydantic Schema（camelCase alias 映射）
5. 前端使用自动生成的类型，无需手写接口

### 1.5 认证系统 (Authentication)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   前端        │     │   FastAPI     │     │   Redis      │
│              │     │              │     │              │
│ POST /auth/  │────►│ bcrypt 验证   │     │              │
│   login      │     │ JWT 签发     │     │              │
│              │◄────│ 返回 token   │     │              │
│              │     │              │     │              │
│ 请求带       │────►│ JWT 解码     │────►│ bl:{jti}     │
│ Authorization│     │ 黑名单检查   │     │ 黑名单检查   │
│ Bearer token │     │              │     │              │
│              │     │ POST /auth/  │────►│ SET bl:{jti} │
│              │     │   logout     │     │ 加入黑名单   │
└──────────────┘     └──────────────┘     └──────────────┘
```

**技术栈**：
- **密码哈希**：bcrypt（passlib CryptContext）
- **Token**：JWT (PyJWT)，HS256 签名，包含 `sub`（用户ID）、`jti`（唯一标识）、`exp`（过期时间）
- **双 Token 机制**：Access Token（短期，30分钟）+ Refresh Token（长期，7天）
- **Token 黑名单**：Redis `bl:{jti}` 键，TTL = 剩余有效期，logout 时写入
- **Refresh Token 存储**：Redis `refresh:{user_id}` 键，登录/刷新时覆盖写入

**认证端点**：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/auth/register` | POST | 注册（bcrypt 哈希 + 返回双 token） |
| `/auth/login` | POST | 登录（验证密码 + 返回双 token） |
| `/auth/refresh` | POST | 刷新（验证 refresh token + Redis 比对） |
| `/auth/logout` | POST | 登出（access token 加入 Redis 黑名单） |
| `/auth/me` | GET | 获取当前用户信息 |

### 1.6 数据库迁移 (Alembic)

- 迁移框架：Alembic，支持 async SQLAlchemy
- 配置文件：`backend/alembic.ini`，脚本目录 `backend/alembic/`
- 迁移脚本通过 `env.py` 中的 async engine 执行
- **当前状态**：Alembic 基础设施已就绪，初始迁移尚未生成

### 1.7 Agent 状态生命周期 (Agent Status Lifecycle)

`AgentProfile.status` 字段（VARCHAR(20)）追踪每个 Agent 的运行时状态：

```
┌──────────┐
│ offline  │ ◄── Agent 初始/离线状态
└────┬─────┘
     │ 用户发送消息（sendMessage）
     ▼
┌──────────┐
│   busy   │ ◄── Agent 正在处理任务
└──┬───┬───┘
   │   │
   │   │ 执行失败
   │   ▼
   │ ┌──────────┐
   │ │  error   │ ◄── Agent 执行异常
   │ └──────────┘
   │
   │ 执行完成
   ▼
┌──────────┐
│  online  │ ◄── Agent 就绪可用
└──────────┘
```

**状态转换规则**：

| 触发条件 | 原状态 | 新状态 | 代码位置 |
|----------|--------|--------|----------|
| 用户发送消息 | any | `busy` | `_handle_send_message` 中 `UPDATE agent_profiles SET status='busy'` |
| Agent 执行完成 | `busy` | `online` | 收到 `completed` 事件时更新 |
| Agent 执行失败 | `busy` | `error` | 收到 `failed` 事件或异常捕获时更新 |
| WebSocket 断开连接 | `busy`/`error` | `online` | `finally` 块中重置，防止状态卡死 |

---

## 2. 全双工通信与协议分工 (Communication Protocols)

### 2.1 协议选择矩阵

| 场景 | 协议 | 特性 | 示例 |
|------|------|------|------|
| 静态数据 CRUD | HTTP REST | 请求-响应、无状态、可缓存 | 会话列表、Agent 市场 |
| 实时消息推送 | WebSocket | 全双工、低延迟、持久连接 | 流式输出、状态卡片 |

### 2.2 HTTP REST 路由规范

#### 会话管理

```
GET    /api/sessions              # 获取会话列表（分页）
GET    /api/sessions/:id          # 获取单个会话详情
POST   /api/sessions              # 创建新会话
PATCH  /api/sessions/:id          # 更新会话（标题、Pin 消息等）
DELETE /api/sessions/:id          # 删除会话
```

#### 消息历史

```
GET    /api/sessions/:id/messages # 获取消息历史（游标分页）
       ?cursor=<message_id>&limit=50
```

#### Agent 市场

```
GET    /api/agents                # 获取可用 Agent 列表
GET    /api/agents/:id            # 获取 Agent 元数据（能力描述、模型配置）
```

#### 响应格式

```json
{
  "code": 0,
  "data": { ... },
  "message": "success"
}
```

### 2.3 WebSocket 协议规范

#### 连接管理

```
ws://localhost:8000/ws?session_id=<session_id>&token=<auth_token>
```

#### 报文类型定义 (基于 `ws_messages.json`)

##### 用户 → 服务端

```typescript
// 用户发送消息
interface UserSendMessage {
  type: "user_send";
  payload: {
    session_id: string;
    content: string;
    mentions: string[];  // @ 的 Agent ID 列表
  };
}
```

##### 服务端 → 用户（7 种 S2C 类型化模型）

所有 S2C 模型定义在 `backend/app/schemas/ws.py`，使用 Pydantic v2 + camelCase alias：

| 类型 (type) | 模型类 | 用途 |
|-------------|--------|------|
| `pong` | `S2CPong` | 心跳响应 |
| `agentStatus` | `S2CAgentStatus` | Agent 状态变更通知（analyzing/executing/completed/failed） |
| `messageChunk` | `S2CMessageChunk` | 流式消息分片（delta_content + chunk_index + is_final） |
| `messageComplete` | `S2CMessageComplete` | 消息完成（完整 content + card_data） |
| `error` | `S2CError` | 错误卡片（error_code + recoverable） |
| `actionStatus` | `S2CActionStatus` | 动作执行状态（applying/pending） |
| `actionResult` | `S2CActionResult` | 动作执行结果（applied/rejected/failed） |

联合类型：`S2CMessage = Union[S2CPong, S2CAgentStatus, S2CMessageChunk, S2CMessageComplete, S2CError, S2CActionStatus, S2CActionResult]`

```python
# 示例：S2C 消息分片 payload
class MessageChunkPayload(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)
    message_id: str
    session_id: str
    agent_id: str
    chunk_type: Literal["text", "code_diff", "web_preview", "deploy_status", "tool_status"]
    delta_content: str
    chunk_index: int = Field(ge=0)
    is_final: bool
```

### 2.4 WebSocket 生命周期状态机

```
┌─────────┐
│ PENDING │ ◄── 连接建立，等待认证
└────┬────┘
     │ auth_success
     ▼
┌─────────┐
│  READY  │ ◄── 认证通过，可收发消息
└────┬────┘
     │ user_send
     ▼
┌──────────────┐
│  PROCESSING  │ ◄── Orchestrator 编排中，流式推送状态
└────┬────┬────┘
     │    │ error
     │    ▼
     │  ┌─────────┐
     │  │  ERROR  │ ◄── 异常捕获，推送 Error 卡片
     │  └────┬────┘
     │       │ recoverable=true
     │       └──────► READY
     │
     │ agent_stream (is_final=true)
     ▼
┌─────────┐
│  READY  │ ◄── 回到就绪状态
└─────────┘
```

---

## 3. 后端 Agent 统一适配器设计 (Unified Adapter Pattern)

### 3.1 BaseAdapter 抽象基类定义

```python
# backend/app/agents/base_adapter.py

from abc import ABC, abstractmethod
from typing import List, AsyncGenerator
from pydantic import BaseModel


class Message(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str


class MessageChunk(BaseModel):
    chunk_type: str  # "text" | "code_diff" | "web_preview" | "deploy_status"
    content: str
    is_final: bool


class BaseAdapter(ABC):
    """Agent 统一适配器抽象基类
    
    所有外部 LLM 调用必须继承此类并实现 stream_chat 接口
    """
    
    @abstractmethod
    async def stream_chat(
        self,
        messages: List[Message],
        **kwargs
    ) -> AsyncGenerator[MessageChunk, None]:
        """流式聊天接口
        
        Args:
            messages: 对话历史消息列表
            **kwargs: 额外配置参数（temperature, max_tokens 等）
            
        Yields:
            MessageChunk: 流式输出的消息块
        """
        ...
    
    async def validate_messages(self, messages: List[Message]) -> bool:
        """校验消息格式（可选覆盖）"""
        return all(m.role in ("user", "assistant", "system") for m in messages)
```

### 3.2 派生适配器实现规范

#### claude_code.py

```python
# backend/app/agents/providers/claude_code.py

from ..base_adapter import BaseAdapter, Message, MessageChunk
from typing import List, AsyncGenerator


class ClaudeCodeAdapter(BaseAdapter):
    """Claude Code 适配器"""
    
    async def stream_chat(
        self,
        messages: List[Message],
        **kwargs
    ) -> AsyncGenerator[MessageChunk, None]:
        # 调用 Claude API
        # 将响应转换为 MessageChunk 格式
        yield MessageChunk(
            chunk_type="text",
            content="...",
            is_final=False
        )
```

#### codex.py

```python
# backend/app/agents/providers/codex.py

from ..base_adapter import BaseAdapter, Message, MessageChunk
from typing import List, AsyncGenerator


class CodexAdapter(BaseAdapter):
    """Codex 适配器"""
    
    async def stream_chat(
        self,
        messages: List[Message],
        **kwargs
    ) -> AsyncGenerator[MessageChunk, None]:
        # 调用 Codex API
        # 将响应转换为 MessageChunk 格式
        yield MessageChunk(
            chunk_type="code_diff",
            content="...",
            is_final=False
        )
```

#### opencode.py

```python
# backend/app/agents/providers/opencode.py

from ..base_adapter import BaseAdapter, Message, MessageChunk
from typing import List, AsyncGenerator


class OpenCodeAdapter(BaseAdapter):
    """OpenCode 适配器"""
    
    async def stream_chat(
        self,
        messages: List[Message],
        **kwargs
    ) -> AsyncGenerator[MessageChunk, None]:
        # 调用 OpenCode API
        # 将响应转换为 MessageChunk 格式
        yield MessageChunk(
            chunk_type="text",
            content="...",
            is_final=False
        )
```

### 3.3 适配器注册与工厂模式

```python
# backend/app/agents/registry.py

from typing import Dict, Type
from .base_adapter import BaseAdapter
from .providers.claude_code import ClaudeCodeAdapter
from .providers.codex import CodexAdapter
from .providers.opencode import OpenCodeAdapter


ADAPTER_REGISTRY: Dict[str, Type[BaseAdapter]] = {
    "claude_code": ClaudeCodeAdapter,
    "codex": CodexAdapter,
    "opencode": OpenCodeAdapter,
}


def get_adapter(agent_id: str) -> BaseAdapter:
    """根据 agent_id 获取对应适配器实例"""
    if agent_id not in ADAPTER_REGISTRY:
        raise ValueError(f"Unknown agent: {agent_id}")
    return ADAPTER_REGISTRY[agent_id]()
```

---

## 4. 异常隔离与安全网关 (Fault Isolation)

### 4.1 架构级约束

> **严禁在大模型调用失败、超时或速率限制时使 WebSocket 断开或静默死掉。**

### 4.2 全局异常拦截器设计

```python
# backend/app/core/exception_handler.py

import traceback
from datetime import datetime
from typing import Optional
from fastapi import WebSocket
from pydantic import BaseModel


class ErrorCardPayload(BaseModel):
    session_id: str
    error_code: str
    error_message: str
    recoverable: bool
    timestamp: str


class WSMessage(BaseModel):
    type: str = "error"
    payload: ErrorCardPayload


class GlobalExceptionHandler:
    """全局异常拦截器
    
    捕获所有异步操作和大模型调用异常，
    包装为符合 ws_messages.json 契约的 Error 卡片，
    通过当前会话的 WS 通道即时推向前端。
    """
    
    @staticmethod
    async def handle_exception(
        websocket: WebSocket,
        session_id: str,
        exception: Exception
    ) -> None:
        """处理异常并推送 Error 卡片"""
        
        error_code = GlobalExceptionHandler._classify_error(exception)
        recoverable = GlobalExceptionHandler._is_recoverable(exception)
        
        error_card = WSMessage(
            payload=ErrorCardPayload(
                session_id=session_id,
                error_code=error_code,
                error_message=str(exception),
                recoverable=recoverable,
                timestamp=datetime.utcnow().isoformat()
            )
        )
        
        await websocket.send_json(error_card.model_dump())
    
    @staticmethod
    def _classify_error(exception: Exception) -> str:
        """错误分类"""
        error_mapping = {
            TimeoutError: "TIMEOUT",
            ConnectionError: "CONNECTION_ERROR",
            RateLimitError: "RATE_LIMIT",
            AuthenticationError: "AUTH_ERROR",
        }
        return error_mapping.get(type(exception), "UNKNOWN_ERROR")
    
    @staticmethod
    def _is_recoverable(exception: Exception) -> bool:
        """判断是否可恢复"""
        recoverable_errors = (TimeoutError, RateLimitError, ConnectionError)
        return isinstance(exception, recoverable_errors)
```

### 4.3 WebSocket 路由中的异常捕获

```python
# backend/app/routes/websocket.py

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..core.exception_handler import GlobalExceptionHandler
from ..agents.orchestrator import Orchestrator

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, session_id: str, token: str):
    await websocket.accept()
    
    try:
        # 认证逻辑
        if not await authenticate(token):
            await GlobalExceptionHandler.handle_exception(
                websocket, session_id, AuthenticationError("Invalid token")
            )
            await websocket.close()
            return
        
        orchestrator = Orchestrator()
        
        while True:
            data = await websocket.receive_json()
            
            try:
                # 正常业务逻辑
                async for chunk in orchestrator.process(data, session_id):
                    await websocket.send_json({
                        "type": "agent_stream",
                        "payload": chunk.model_dump()
                    })
                    
            except Exception as e:
                # 单次请求异常：推送 Error 卡片，但不关闭连接
                await GlobalExceptionHandler.handle_exception(
                    websocket, session_id, e
                )
                
    except WebSocketDisconnect:
        # 客户端主动断开，正常清理
        pass
    except Exception as e:
        # 连接级异常：推送 Error 卡片后关闭
        await GlobalExceptionHandler.handle_exception(
            websocket, session_id, e
        )
        await websocket.close()
```

### 4.4 错误分类与处理策略

| 错误类型 | 错误码 | recoverable | 处理策略 |
|----------|--------|-------------|----------|
| 大模型超时 | `TIMEOUT` | true | 推送 Error 卡片，等待用户重试 |
| 速率限制 | `RATE_LIMIT` | true | 推送 Error 卡片，建议稍后重试 |
| 连接中断 | `CONNECTION_ERROR` | true | 推送 Error 卡片，自动重连 |
| 认证失败 | `AUTH_ERROR` | false | 推送 Error 卡片，关闭连接 |
| 未知错误 | `UNKNOWN_ERROR` | false | 推送 Error 卡片，记录日志 |

### 4.5 错误卡片前端渲染规范

```typescript
// frontend/src/components/ErrorCard.tsx

interface ErrorCardProps {
  error_code: string;
  error_message: string;
  recoverable: boolean;
  onRetry?: () => void;
}

export function ErrorCard({ error_code, error_message, recoverable, onRetry }: ErrorCardProps) {
  return (
    <div className="border border-red-200 bg-red-50 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <span className="text-red-600 font-medium">⚠️ {error_code}</span>
      </div>
      <p className="text-red-800 mt-2">{error_message}</p>
      {recoverable && onRetry && (
        <button 
          onClick={onRetry}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          重试
        </button>
      )}
    </div>
  );
}
```

---

## 附录：架构约束检查清单

- [ ] `shared/` 是否零依赖？
- [ ] `frontend/` 是否只依赖 `shared/`？
- [ ] `backend/` 是否通过脚本同步 `shared/` 模型？
- [ ] 实体字段变更是否先改 `shared/schemas/` 再改后端/前端？（契约优先）
- [ ] 所有 Agent 适配器是否继承 `BaseAdapter`？
- [ ] Agent 状态是否正确流转（offline → busy → online/error）？
- [ ] WebSocket 断开时是否重置 busy/error Agent 为 online？
- [ ] WebSocket S2C 消息是否使用类型化模型（`S2CMessage` union）？
- [ ] 认证 token 是否检查 Redis 黑名单？
- [ ] WebSocket 异常是否包装为 Error 卡片推送？
- [ ] 是否存在静默死掉的异步操作？
