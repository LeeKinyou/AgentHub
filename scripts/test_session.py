"""Test session creation API to debug 422 error."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import requests
import json

BASE = "http://localhost:8001/api"

# 1. Login as admin (the user from the browser)
r = requests.post(f"{BASE}/auth/login", json={"username": "admin", "password": "password123"})
print(f"Login: {r.status_code}")
if r.status_code != 200:
    # Try registering
    r = requests.post(f"{BASE}/auth/register", json={"username": "admin", "email": "admin@test.com", "password": "password123"})
    print(f"Register: {r.status_code}")

data = r.json().get("data", {})
token = data["access_token"]
user_id = data["user"]["id"]
h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
print(f"User: {user_id}")

# 2. List agents
r2 = requests.get(f"{BASE}/agents?user_id={user_id}", headers=h)
print(f"\nAgents: {r2.status_code}")
agents = r2.json().get("data", [])
for a in agents:
    print(f"  {a['name']} - {a['id']}")

# 3. Test session creation with different formats
agent_id = agents[0]["id"] if agents else "00000000-0000-0000-0000-000000000000"

# Test 1: snake_case format (what backend expects)
print(f"\n--- Test 1: snake_case ---")
body1 = {"title": "test session", "type": "single", "agent_ids": [agent_id]}
print(f"Body: {json.dumps(body1)}")
r3 = requests.post(f"{BASE}/users/{user_id}/sessions", headers=h, json=body1)
print(f"Result: {r3.status_code} {r3.text[:300]}")

# Test 2: camelCase format (what frontend might send)
print(f"\n--- Test 2: camelCase ---")
body2 = {"title": "test session", "type": "single", "agentIds": [agent_id]}
print(f"Body: {json.dumps(body2)}")
r4 = requests.post(f"{BASE}/users/{user_id}/sessions", headers=h, json=body2)
print(f"Result: {r4.status_code} {r4.text[:300]}")

# Test 3: minimal body
print(f"\n--- Test 3: minimal ---")
body3 = {"agent_ids": [agent_id]}
print(f"Body: {json.dumps(body3)}")
r5 = requests.post(f"{BASE}/users/{user_id}/sessions", headers=h, json=body3)
print(f"Result: {r5.status_code} {r5.text[:300]}")
