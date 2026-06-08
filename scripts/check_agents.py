"""Check agents in the database."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import requests

r = requests.post('http://localhost:8001/api/auth/login', json={'username':'mimouser','password':'password123'})
token = r.json()['data']['access_token']
h = {'Authorization': f'Bearer {token}'}
r2 = requests.get('http://localhost:8001/api/agents', headers=h)
agents = r2.json()['data']
for a in agents:
    cfg = a.get('agentConfig') or a.get('agent_config') or {}
    print(f"Name: {a['name']}")
    print(f"  adapterType: {a.get('adapterType', 'N/A')}")
    print(f"  model: {cfg.get('model', 'N/A')}")
    print(f"  baseUrl: {cfg.get('base_url', cfg.get('baseUrl', 'N/A'))}")
    print(f"  apiKey: {str(cfg.get('api_key', cfg.get('apiKey', 'N/A')))[:30]}...")
    print(f"  systemPrompt: {a.get('systemPrompt', a.get('system_prompt', 'N/A'))[:100]}...")
    print()
