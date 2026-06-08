"""End-to-end test: register, login, create agent, create session, send message via WS."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import requests
import json
import asyncio
import websockets

BASE = "http://localhost:8001/api"
WS_BASE = "ws://localhost:8001/ws"

async def main():
    # 1. Register/Login
    print("=== Step 1: Login ===")
    r = requests.post(f"{BASE}/auth/login", json={"username": "e2euser", "password": "password123"})
    if r.status_code != 200:
        r = requests.post(f"{BASE}/auth/register", json={
            "username": "e2euser", "email": "e2e@test.com", "password": "password123"
        })
        print(f"Register: {r.status_code}")
    else:
        print(f"Login: {r.status_code}")

    data = r.json().get("data", {})
    if not data:
        print(f"Response: {r.text[:300]}")
        return
    token = data["access_token"]
    user_id = data["user"]["id"]
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    print(f"User: {user_id}")

    # 2. Create agent with MiMo config
    print("\n=== Step 2: Create Agent ===")
    agent_body = {
        "name": "MiMo 测试 Agent",
        "role": "expert",
        "adapter_type": "custom",
        "description": "MiMo 大模型测试",
        "system_prompt": "你是一个有用的AI助手，请用中文回答问题。",
        "agent_config": {
            "api_key": "tp-cybh4m0z3o45riu4daqk7zqc7co3pi5864d7a6t0x35stmkq",
            "base_url": "https://token-plan-cn.xiaomimimo.com/v1",
            "model": "mimo-v2.5-pro"
        }
    }
    r2 = requests.post(f"{BASE}/agents?user_id={user_id}", headers=h, json=agent_body)
    print(f"Create Agent: {r2.status_code}")
    if r2.status_code != 200:
        print(f"Error: {r2.text[:200]}")
        return
    agent = r2.json()["data"]
    agent_id = agent["id"]
    print(f"Agent ID: {agent_id}")

    # 3. Create session
    print("\n=== Step 3: Create Session ===")
    session_body = {
        "title": "测试会话",
        "type": "single",
        "agent_ids": [agent_id]
    }
    r3 = requests.post(f"{BASE}/users/{user_id}/sessions", headers=h, json=session_body)
    print(f"Create Session: {r3.status_code}")
    if r3.status_code != 200:
        print(f"Error: {r3.text[:200]}")
        return
    session = r3.json()["data"]
    session_id = session["id"]
    print(f"Session ID: {session_id}")

    # 4. Connect via WebSocket and send message
    print("\n=== Step 4: WebSocket Chat ===")
    ws_url = f"{WS_BASE}?session_id={session_id}&token={token}"
    print(f"Connecting to: {ws_url[:80]}...")

    try:
        extra_headers = {"Origin": "http://localhost:3000"}
        async with websockets.connect(ws_url, max_size=10*1024*1024, additional_headers=extra_headers) as ws:
            print("WebSocket connected!")

            # Send a message
            msg = {"type": "sendMessage", "timestamp": "2026-06-05T12:00:00Z", "payload": {"sessionId": session_id, "content": "你好，请简单介绍一下自己。"}}
            await ws.send(json.dumps(msg))
            print(f"Sent: {msg['payload']['content']}")

            # Receive responses
            chunks = []
            for _ in range(100):  # max 100 messages
                try:
                    raw = await asyncio.wait_for(ws.recv(), timeout=60)
                    data = json.loads(raw)
                    msg_type = data.get("type", "")

                    if msg_type == "agentStatus":
                        print(f"  [{msg_type}] agent={data.get('agentId','')[:8]} status={data.get('status','')} text={data.get('displayText','')[:50]}")
                    elif msg_type == "chatChunk":
                        chunk = data.get("chunk", "")
                        chunks.append(chunk)
                    elif msg_type == "chatComplete":
                        print(f"  [{msg_type}] Complete! Total chunks: {len(chunks)}")
                        print(f"  Response: {''.join(chunks)[:200]}")
                        break
                    elif msg_type == "error":
                        print(f"  [{msg_type}] Error: {data.get('errorCode','')} - {data.get('errorMessage','')}")
                        break
                    else:
                        print(f"  [{msg_type}] {json.dumps(data, ensure_ascii=False)[:100]}")
                except asyncio.TimeoutError:
                    print("  Timeout waiting for response")
                    break
                except websockets.exceptions.ConnectionClosed as e:
                    print(f"  Connection closed: code={e.code} reason={e.reason}")
                    break

            if chunks:
                full_response = "".join(chunks)
                print(f"\n=== Full Response ({len(full_response)} chars) ===")
                print(full_response[:500])
            else:
                print("\n=== No response received ===")

    except websockets.exceptions.ConnectionClosed as e:
        print(f"WebSocket closed during handshake: code={e.code} reason={e.reason}")
    except Exception as e:
        print(f"WebSocket error: {type(e).__name__}: {e}")

asyncio.run(main())
