"""Create 4 agents via API: MiMo, Frontend, Backend, Orchestrator."""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import requests

BASE = "http://localhost:8001/api"
MIMO_KEY = "tp-cybh4m0z3o45riu4daqk7zqc7co3pi5864d7a6t0x35stmkq"
MIMO_BASE = "https://token-plan-cn.xiaomimimo.com/v1"
MIMO_MODEL = "mimo-v2.5-pro"

# 1. Register or login to get token
print("Registering...")
resp = requests.post(f"{BASE}/auth/register", json={
    "username": "mimouser", "email": "mimo@test.com", "password": "password123"
})
print(f"  {resp.status_code}")
data = resp.json().get("data")

if not data:
    print("Login instead...")
    resp = requests.post(f"{BASE}/auth/login", json={
        "username": "mimouser", "password": "password123"
    })
    data = resp.json().get("data")

token = data["access_token"]
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
print(f"Token: {token[:30]}...")

# 2. Create agents — only MiMo agent exposes its identity;
#    the other three use MiMo API under the hood but display only their role.
agents = [
    {
        "name": "MiMo",
        "avatar": "🧠",
        "role": "expert",
        "adapter_type": "custom",
        "description": "小米 MiMo 大模型，通用对话与推理",
        "system_prompt": (
            "你是小米MiMo大模型。你擅长中文对话、逻辑推理、知识问答和创意写作。"
            "请用简洁清晰的中文回答用户问题。"
        ),
        "agent_config": {
            "api_provider": "openai",
            "api_key": MIMO_KEY,
            "base_url": MIMO_BASE,
            "model": MIMO_MODEL,
        },
    },
    {
        "name": "前端工程师",
        "avatar": "🎨",
        "role": "expert",
        "adapter_type": "custom",
        "description": "负责前端开发，擅长 React、Next.js、TypeScript、Tailwind CSS",
        "system_prompt": (
            "你是一位资深前端工程师。你的专长包括：\n"
            "1. React/Next.js 前端开发\n"
            "2. TypeScript 类型安全\n"
            "3. Tailwind CSS 样式设计\n"
            "4. 组件架构与状态管理\n"
            "5. 响应式设计与交互体验\n"
            "请给出详细的技术方案和代码实现，代码示例使用 TypeScript/React。回复时请使用中文。"
        ),
        "agent_config": {
            "api_provider": "openai",
            "api_key": MIMO_KEY,
            "base_url": MIMO_BASE,
            "model": MIMO_MODEL,
        },
    },
    {
        "name": "后端工程师",
        "avatar": "⚙️",
        "role": "expert",
        "adapter_type": "custom",
        "description": "负责后端开发，擅长 Python、FastAPI、数据库设计、API 架构",
        "system_prompt": (
            "你是一位资深后端工程师。你的专长包括：\n"
            "1. Python/FastAPI 后端开发\n"
            "2. RESTful API 设计\n"
            "3. 数据库设计与优化（SQLAlchemy/PostgreSQL/SQLite）\n"
            "4. 认证与授权（JWT/OAuth2）\n"
            "5. WebSocket 实时通信\n"
            "请给出详细的技术方案和代码实现，代码示例使用 Python。回复时请使用中文。"
        ),
        "agent_config": {
            "api_provider": "openai",
            "api_key": MIMO_KEY,
            "base_url": MIMO_BASE,
            "model": MIMO_MODEL,
        },
    },
    {
        "name": "编排器",
        "avatar": "🤖",
        "role": "orchestrator",
        "adapter_type": "custom",
        "description": "主编排器，负责任务拆解与多 Agent 协作调度",
        "system_prompt": (
            "你是 AgentHub 的主编排器。你的职责是：\n"
            "1. 分析用户需求，判断是否需要多个 Agent 协作\n"
            "2. 拆解复杂任务为子任务\n"
            "3. 分配子任务给合适的 Agent\n"
            "4. 汇总各 Agent 的结果并回复用户\n"
            "当用户的问题比较简单时，直接回答即可。回复时请使用中文。"
        ),
        "agent_config": {
            "api_provider": "openai",
            "api_key": MIMO_KEY,
            "base_url": MIMO_BASE,
            "model": MIMO_MODEL,
        },
    },
]

for agent in agents:
    r = requests.post(f"{BASE}/agents", json=agent, headers=headers)
    if r.status_code == 200:
        d = r.json().get("data", {})
        print(f"✅ Created: {d.get('name')} [{d.get('role')}] - {d.get('id')}")
    else:
        print(f"❌ Failed: {agent['name']} - {r.status_code} {r.text[:200]}")

# 3. List all agents
r = requests.get(f"{BASE}/agents", headers=headers)
print(f"\n=== All Agents ===")
for a in r.json().get("data", []):
    cfg = a.get("agent_config") or {}
    print(f"  {a['name']} [{a['role']}] adapter={a.get('adapter_type', 'N/A')} "
          f"model={cfg.get('model','N/A')} id={a['id']}")
