"""Read-only provider checks using a private local secret file. Never print secrets."""
import json
from pathlib import Path

import httpx
import psycopg

root = Path(__file__).resolve().parents[1]
values = json.loads((root / ".local/hosting-secrets.json").read_text())
with psycopg.connect(values["NEON_DATABASE_URL"]) as db:
    version = db.execute("SHOW server_version").fetchone()[0]
    tables = db.execute("SELECT tablename FROM pg_tables WHERE schemaname='public'").fetchall()
    print(json.dumps({"neon_connected": True, "postgres_version": version, "public_tables": [t[0] for t in tables]}))
headers = {"Authorization": "Bearer " + values["GROQ_API_KEY"]}
with httpx.Client(timeout=60) as client:
    models = client.get("https://api.groq.com/openai/v1/models", headers=headers)
    print(json.dumps({"groq_status": models.status_code, "target_model_available": any(m["id"] == "openai/gpt-oss-120b" for m in models.json().get("data", []))}))
    response = client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json={
        "model": "openai/gpt-oss-120b", "messages": [{"role": "user", "content": "Call the portfolio_summary tool. Do not invent a result."}],
        "tools": [{"type": "function", "function": {"name": "portfolio_summary", "description": "Read a portfolio summary", "parameters": {"type": "object", "properties": {}}}}],
        "tool_choice": "required", "reasoning_effort": "low", "max_completion_tokens": 256})
    value = response.json()
    print(json.dumps({"groq_tool_status": response.status_code, "tool_calls": [t.get("function", {}).get("name") for t in value.get("choices", [{}])[0].get("message", {}).get("tool_calls", [])], "usage": value.get("usage")}))
