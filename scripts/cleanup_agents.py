"""Delete all agents and re-create only the 4 needed."""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import requests

BASE = "http://localhost:8001/api"
MIMO_KEY = "tp-cybh4m0z3o45riu4daqk7zqc7co3pi5864d7a6t0x35stmkq"
MIMO_BASE = "https://token-plan-cn.xiaomimimo.com/v1"
MIMO_MODEL = "mimo-v2.5-pro"

# 1. Login
print("Logging in...")
resp = requests.post(f"{BASE}/auth/login", json={
    "username": "mimouser", "password": "password123"
})
data = resp.json().get("data")
if not data:
    print("Login failed!")
    sys.exit(1)

token = data["access_token"]
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# 2. Delete all agents
print("\nDeleting all agents...")
r = requests.get(f"{BASE}/agents", headers=headers)
agents = r.json().get("data", [])
print(f"  Found {len(agents)} agents")

for a in agents:
    dr = requests.delete(f"{BASE}/agents/{a['id']}", headers=headers)
    if dr.status_code == 200:
        print(f"  🗑️ Deleted: {a['name']} [{a['id'][:12]}...]")
    else:
        print(f"  ❌ Failed to delete: {a['name']} - {dr.status_code}")

# 3. Re-create the 4 agents
print("\nCreating 4 agents...")
agents_to_create = [
    {
        "name": "MiMo",
        "avatar": "🧠",
        "role": "expert",
        "adapter_type": "custom",
        "description": "小米 MiMo 大模型，通用对话与推理",
        "system_prompt": "你是小米MiMo大模型。你擅长中文对话、逻辑推理、知识问答和创意写作。请用简洁清晰的中文回答用户问题。",
        "agent_config": {"api_provider": "openai", "api_key": MIMO_KEY, "base_url": MIMO_BASE, "model": MIMO_MODEL},
    },
    {
        "name": "前端工程师",
        "avatar": "🎨",
        "role": "expert",
        "adapter_type": "custom",
        "description": "负责前端开发，擅长 React、Next.js、TypeScript、Tailwind CSS",
        "system_prompt": "你是一位资深前端工程师。你的专长包括：\n1. React/Next.js 前端开发\n2. TypeScript 类型安全\n3. Tailwind CSS 样式设计\n4. 组件架构与状态管理\n5. 响应式设计与交互体验\n请给出详细的技术方案和代码实现，代码示例使用 TypeScript/React。回复时请使用中文。",
        "agent_config": {"api_provider": "openai", "api_key": MIMO_KEY, "base_url": MIMO_BASE, "model": MIMO_MODEL},
    },
    {
        "name": "后端工程师",
        "avatar": "⚙️",
        "role": "expert",
        "adapter_type": "custom",
        "description": "负责后端开发，擅长 Python、FastAPI、数据库设计、API 架构",
        "system_prompt": "你是一位资深后端工程师。你的专长包括：\n1. Python/FastAPI 后端开发\n2. RESTful API 设计\n3. 数据库设计与优化（SQLAlchemy/PostgreSQL/SQLite）\n4. 认证与授权（JWT/OAuth2）\n5. WebSocket 实时通信\n请给出详细的技术方案和代码实现，代码示例使用 Python。回复时请使用中文。",
        "agent_config": {"api_provider": "openai", "api_key": MIMO_KEY, "base_url": MIMO_BASE, "model": MIMO_MODEL},
    },
    {
        "name": "编排器",
        "avatar": "🤖",
        "role": "orchestrator",
        "adapter_type": "custom",
        "description": "主编排器，负责任务拆解与多 Agent 协作调度",
        "system_prompt": "你是 AgentHub 的主编排器。你的职责是：\n1. 分析用户需求，判断是否需要多个 Agent 协作\n2. 拆解复杂任务为子任务\n3. 分配子任务给合适的 Agent\n4. 汇总各 Agent 的结果并回复用户\n当用户的问题比较简单时，直接回答即可。回复时请使用中文。",
        "agent_config": {"api_provider": "openai", "api_key": MIMO_KEY, "base_url": MIMO_BASE, "model": MIMO_MODEL},
    },
]

for agent in agents_to_create:
    r = requests.post(f"{BASE}/agents", json=agent, headers=headers)
    if r.status_code == 200:
        d = r.json().get("data", {})
        print(f"  ✅ Created: {d.get('name')} [{d.get('role')}]")
    else:
        print(f"  ❌ Failed: {agent['name']} - {r.status_code}")

print("\nDone!")
