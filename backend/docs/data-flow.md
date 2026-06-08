# 全流程数据流

从用户发送消息到 Agent 执行任务的端到端数据流，覆盖 WebSocket、编排器、适配器、LLM API、数据库各层。

## 架构总览

```
┌─────────────┐    WebSocket JSON     ┌──────────────────┐
│   前端 Client │ ◄──────────────────► │  WebSocket Handler │
│  (Next.js)   │    camelCase         │  (routes/websocket.py) │
└─────────────┘                       └────────┬─────────┘
                                               │
                                    ┌──────────▼─────────┐
                                    │    Orchestrator      │
                                    │  (agents/orchestrator.py) │
                                    └──────────┬─────────┘
                                               │
                         ┌─────────────────────┼─────────────────────┐
                         │                     │                     │
                ┌────────▼────────┐   ┌────────▼────────┐   ┌────────▼────────┐
                │  Claude Code    │   │  Codex / OpenCode │   │  Custom + MCP   │
                │  Adapter        │   │  Adapter          │   │  Adapter        │
                └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
                         │                     │                     │
                ┌────────▼─────────────────────▼─────────────────────▼────────┐
                │                    LLM API (Anthropic / OpenAI)             │
                └────────────────────────────────────────────────────────────┘
                                               │
                                    ┌──────────▼─────────┐
                                    │   PostgreSQL + Redis │
                                    │   (持久化存储)        │
                                    └────────────────────┘
```

---

## Phase 1: WebSocket 连接建立

```
Client                          Server (websocket_endpoint)
  │                                    │
  │── ws://host/ws?session_id=X        │
  │   &token=JWT                       │
  │───────────────────────────────────►│
  │                                    │── decode_access_token(token)
  │                                    │── Redis 黑名单检查 (bl:{jti})
  │                                    │   (认证失败则 close(4003))
  │                                    │
  │◄──── websocket.accept() ──────────│
  │                                    │
  │                                    │── DB 查询 Session, 校验 user_id 归属
  │                                    │── 查询 Session.agent_ids → AgentProfile[]
  │                                    │── 解密 agent_config.api_key
  │                                    │── 构建 AgentDescriptor[]
  │                                    │   (agent_id, name, role, adapter_type,
  │                                    │    system_prompt, agent_config, skills)
  │                                    │── 创建 Orchestrator 实例
  │◄──── 进入消息循环 ────────────────│
```

**关键文件**: `routes/websocket.py` — `websocket_endpoint()`

---

## Phase 2: 用户发送消息 (sendMessage)

```
Client              WS Handler            Orchestrator           Adapter             LLM API          DB
  │                     │                      │                    │                  │               │
  │── sendMessage ────►│                      │                    │                  │               │
  │  {sessionId,        │                      │                    │                  │               │
  │   content,          │                      │                    │                  │               │
  │   replyToId?}       │                      │                    │                  │               │
  │                     │                      │                    │                  │               │
  │                     │── ① 速率限制检查 ──►│                    │                  │               │
  │                     │   guard.check_rate_limit()               │                  │               │
  │                     │   guard.can_accept_message()             │                  │               │
  │                     │                      │                    │                  │               │
  │                     │── ② 校验 replyToId ─────────────────────────────────────────────────────────►│
  │                     │   (查 DB 确认消息存在)                    │                  │  SELECT       │
  │                     │                      │                    │                  │               │
  │                     │── ③ 持久化用户消息 ──────────────────────────────────────────────────────────►│
  │                     │   INSERT Message {                       │                  │  INSERT       │
  │                     │     sender_type="user",                  │                  │  messages     │
  │                     │     content, reply_to_id                 │                  │               │
  │                     │   }                                      │                  │               │
  │                     │                      │                    │                  │               │
  │                     │── ④ 更新 Session ────────────────────────────────────────────────────────────►│
  │                     │   UPDATE sessions SET                    │                  │  UPDATE       │
  │                     │     last_active_at=now,                  │                  │  sessions     │
  │                     │     last_message_preview=content[:200]   │                  │               │
  │                     │                      │                    │                  │               │
  │                     │── ⑤ 构建对话历史 ────────────────────────────────────────────────────────────►│
  │                     │   SELECT 最近 20 条消息                   │                  │  SELECT       │
  │                     │   → AgentMessage[] {role, content}       │                  │  messages     │
  │                     │                      │                    │                  │               │
  │                     │── ⑥ 标记 Agent 为 busy ──────────────────────────────────────────────────────►│
  │                     │   UPDATE agent_profiles                  │                  │  UPDATE       │
  │                     │     SET status="busy"                    │                  │  agent_profiles│
  │                     │                      │                    │                  │               │
  │                     │── ⑦ 调用编排器 ────►│                    │                  │               │
  │                     │   orchestrator.process(                   │                  │               │
  │                     │     session_id, content,                  │                  │               │
  │                     │     agent_roster,                         │                  │               │
  │                     │     conversation_history                  │                  │               │
  │                     │   )                                      │                  │               │
```

**关键文件**: `routes/websocket.py` — `_handle_send_message()`

---

## Phase 3: 编排器路由决策

```
                        Orchestrator.process()
                               │
                    ┌──────────┴──────────┐
                    │ agent_roster 长度?   │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
         == 1 个           == 1 步           > 1 步
              │                │                │
     ┌────────▼────────┐      │       ┌────────▼────────┐
     │  _delegate_     │      │       │  _plan_execution │
     │  single()       │      │       │  ()              │
     │  直接调用适配器   │      │       │                  │
     │  跳过规划        │      │       │  LLM 规划调用     │
     └────────┬────────┘      │       │  → JSON 计划      │
              │               │       │  → _parse_plan()  │
              │               │       └────────┬────────┘
              │               │                │
              │               │       ┌────────▼────────┐
              │               │       │  _execute_plan  │
              │               │       │  ()              │
              │               │       │                  │
              │               │       │  拓扑排序分组:     │
              │               │       │  Level 1: [A, B] │ ← 并行
              │               │       │  Level 2: [C]    │ ← 等 Level 1 完成
              │               │       │  Level 3: [D, E] │ ← 并行
              │               │       └────────┬────────┘
              │               │                │
              └───────────────┼────────────────┘
                              │
                     ┌────────▼────────┐
                     │  adapter.       │
                     │  stream_chat()  │
                     │                 │
                     │  逐 token 流式   │
                     │  返回 MessageChunk│
                     └─────────────────┘
```

**规划 LLM 的输出格式**:

```json
[
  {"agent_id": "uuid-1", "task": "分析需求并设计架构"},
  {"agent_id": "uuid-2", "task": "实现后端 API"},
  {"agent_id": "uuid-3", "task": "编写前端组件"}
]
```

**降级策略**:
- 规划失败 → 降级为单 Agent（使用 `agent_roster[0]`）
- 单步计划 → 跳过多步执行，直接委派

**关键文件**: `agents/orchestrator.py` — `process()`, `_plan_execution()`, `_execute_plan()`

---

## Phase 4: 适配器流式执行

```
Orchestrator                Adapter                    LLM API
    │                          │                          │
    │── stream_chat(msgs) ───►│                          │
    │                          │── HTTP streaming ──────►│
    │                          │                          │
    │◄── MessageChunk ────────│◄── token "def" ─────────│
    │   {chunk_type:"text",    │                          │
    │    content:"def",        │                          │
    │    is_final:false}       │                          │
    │                          │                          │
    │◄── MessageChunk ────────│◄── token " quick" ──────│
    │   {content:" quick"}     │                          │
    │                          │                          │
    │◄── MessageChunk ────────│◄── stream end ──────────│
    │   {content:"",           │                          │
    │    is_final:true}        │                          │
```

### 适配器对比

| 适配器 | LLM SDK | 特点 |
|--------|---------|------|
| ClaudeCode | `anthropic.AsyncAnthropic` | 基础流式 |
| Codex | `openai.AsyncOpenAI` | 基础流式 |
| OpenCode | `openai.AsyncOpenAI` | 自定义 base_url |
| Custom | Anthropic 或 OpenAI | MCP 工具调用循环，支持递归多轮 |

### Custom 适配器 MCP 工具调用循环

```
stream_chat()
  → _ensure_mcp()           # 懒初始化 MCP 连接
  → _build_tools_payload()  # 合并用户工具 + MCP 工具
  → _loop_anthropic() / _loop_openai()
      → LLM 返回 tool_use block
      → _execute_tool()     # 执行 MCP 工具
      → yield tool_status chunk
      → 递归调用自身 (最多 MAX_TOOL_ROUNDS 轮)
```

**关键文件**: `agents/providers/` — 各适配器实现

---

## Phase 5: WebSocket 消息回传

```
Orchestrator        WS Handler              Client
    │                    │                      │
    │── AgentStatusEvent │                      │
    │   (analyzing) ────►│                      │
    │                    │── S2CAgentStatus ───►│
    │                    │  {agentId, status:    │
    │                    │   "analyzing",        │
    │                    │   displayText}        │
    │                    │                      │
    │── MessageChunk ───►│                      │
    │   (delta)          │── S2CMessageChunk ──►│
    │                    │  {messageId,          │
    │                    │   deltaContent:"def", │
    │                    │   chunkIndex:0,       │
    │                    │   isFinal:false}      │
    │                    │                      │
    │── MessageChunk ───►│                      │
    │   (final)          │── S2CMessageChunk ──►│
    │                    │  {chunkIndex:1,       │
    │                    │   isFinal:true}       │
    │                    │                      │
    │── AgentStatusEvent │                      │
    │   (completed) ────►│                      │
    │                    │── S2CAgentStatus ───►│
    │                    │  {status:"completed"} │
    │                    │                      │
    │                    │── 持久化 Agent 消息 ───────────►│ DB INSERT
    │                    │── 更新 Session ────────────────►│ DB UPDATE
    │                    │── Agent 状态 → "online" ───────►│ DB UPDATE
    │                    │                      │
    │                    │── S2CMessageComplete ►│
    │                    │  {完整 Message 实体}   │
```

---

## Phase 6: Agent 状态生命周期

持久化状态（写入 `agent_profiles.status`）：

```
                    ┌─────────┐
                    │ offline │
                    └────┬────┘
                         │ (首次创建时默认)
                    ┌────▼────┐
           ┌───────│  online │◄──────────────────┐
           │       └────┬────┘                   │
           │            │ (用户发消息)             │
           │       ┌────▼────┐                   │
           │       │  busy   │──── 成功 ──────────┤
           │       └────┬────┘                   │
           │            │                        │
           │       ┌────▼────┐                   │
           │       │  error  │──── WS 断开 ──────┘
           │       └─────────┘
           │
           └──── WS 断开时重置 busy/error → online
```

瞬时状态（仅通过 WebSocket 传输，不写 DB，用于 UI 展示）：

- `analyzing` — Agent 正在分析任务（规划阶段或步骤分析）
- `executing` — Agent 正在生成输出
- `completed` — Agent 完成（触发 DB 更新为 `online`）
- `failed` — Agent 失败（触发 DB 更新为 `error`）

---

## Phase 7: 断开连接清理

```
Client                    WS Handler
  │                            │
  │── 连接断开 ──────────────►│
  │   (客户端关闭/网络中断)     │
  │                            │── orchestrator.cleanup()
  │                            │   (取消所有进行中的适配器工作)
  │                            │
  │                            │── UPDATE agent_profiles
  │                            │   SET status="online"
  │                            │   WHERE status IN ("busy","error")
  │                            │   AND agent_id IN (参与的 agents)
```

---

## 关键数据转换点

| # | 转换 | 位置 |
|---|------|------|
| 1 | 原始 JSON → Pydantic 模型 (camelCase) | `routes/websocket.py` — `validate_ws_message()` |
| 2 | payload dict → DB Message 行 | `_handle_send_message()` — 持久化用户消息 |
| 3 | DB Message 行 → AgentMessage 列表 | `build_conversation_history()` — 最近 20 条 |
| 4 | AgentMessage → LLM API 格式 | 各 adapter `stream_chat()` 内部转换 |
| 5 | LLM stream token → MessageChunk | adapter yield |
| 6 | MessageChunk → S2CMessageChunk (camelCase JSON) | WS handler — Pydantic 序列化 |
| 7 | 累积 chunks → DB Message (完整内容) | WS handler — 流结束后持久化 |
| 8 | LLM 规划 JSON → PlanStep[] | `orchestrator._parse_plan()` |
