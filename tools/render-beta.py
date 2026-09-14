"""Provision only the approved Free Render backend; credentials stay in ignored storage."""
import argparse
import json
import secrets
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("action", choices=["create", "status"])
args = parser.parse_args()
path = ROOT / ".local/hosting-secrets.json"
values = json.loads(path.read_text(encoding="utf-8-sig"))
owner = "tea-dajuavoae00c73beim90"
with httpx.Client(base_url="https://api.render.com/v1", timeout=60,
                  headers={"Authorization": "Bearer " + values["RENDER_API_KEY"]}) as client:
    response = client.get("/services", params={"ownerId": owner, "name": "lokifi-api", "limit": 100})
    response.raise_for_status()
    services = [item["service"] for item in response.json() if item["service"]["name"] == "lokifi-api"]
    if len(services) > 1:
        raise SystemExit("Multiple matching services; refusing ambiguous deployment")
    if args.action == "create" and not services:
        if "PROXY_SECRET" not in values:
            values["PROXY_SECRET"] = secrets.token_urlsafe(48)
            path.write_text(json.dumps(values, indent=2), encoding="utf-8")
        env = {
            "PYTHON_VERSION": "3.12.10",
            "LOKIFI_ENVIRONMENT": "production",
            "LOKIFI_SIGNUP_ENABLED": "false",
            "LOKIFI_WEB_ORIGIN": "https://lokifi-beta.pages.dev",
            "LOKIFI_DATABASE_URL": values["NEON_DATABASE_URL"].replace("postgresql://", "postgresql+psycopg://", 1),
            "LOKIFI_PROXY_SECRET": values["PROXY_SECRET"],
            "LOKIFI_TURNSTILE_SITE_KEY": values["TURNSTILE_SITE_KEY"],
            "LOKIFI_TURNSTILE_SECRET": values["TURNSTILE_SECRET"],
            "LOKIFI_GROQ_API_KEY": values["GROQ_API_KEY"],
            "LOKIFI_GROQ_FREE_CONFIRMED": "true",
            "LOKIFI_RESEARCH_ENABLED": "false",
        }
        response = client.post("/services", json={
            "type": "web_service", "name": "lokifi-api", "ownerId": owner,
            "repo": "https://github.com/ericsocrat/Lokifi", "branch": "codex/portfolio-rebuild",
            "autoDeploy": "no", "rootDir": "apps/api",
            "envVars": [{"key": k, "value": v} for k, v in env.items()],
            "serviceDetails": {"runtime": "python", "plan": "free", "region": "frankfurt",
                "numInstances": 1, "healthCheckPath": "/api/v1/health",
                "envSpecificDetails": {
                    "buildCommand": "pip install uv==0.12.9 && uv sync --frozen --no-dev",
                    "startCommand": "uv run --no-sync alembic upgrade head && uv run --no-sync uvicorn lokifi.main:app --host 0.0.0.0 --port $PORT"}}})
        if response.status_code == 402:
            raise SystemExit("STOP: Render requires payment information. No payment method or paid service was added.")
        if response.status_code != 201:
            # Provider errors can echo submitted configuration: do not dump the response.
            (ROOT / ".local/render-create-error.json").write_text(response.text, encoding="utf-8")
            raise SystemExit(f"Render creation returned HTTP {response.status_code}; private diagnostic saved")
        services = [response.json()["service"]]
    for service in services:
        details = service.get("serviceDetails", {})
        if details.get("plan") != "free":
            raise SystemExit("STOP: matching service is not Free")
        summary = {"id": service["id"], "name": service["name"], "url": details.get("url"),
                   "plan": details.get("plan"), "region": details.get("region")}
        (ROOT / ".local/render-service.json").write_text(json.dumps(summary, indent=2))
        print(json.dumps(summary))
        deployments = client.get(f'/services/{service["id"]}/deploys', params={"limit": 1})
        deployments.raise_for_status()
        print(json.dumps([{"status": d["deploy"]["status"], "id": d["deploy"]["id"]} for d in deployments.json()]))
