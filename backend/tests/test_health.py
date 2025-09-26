from fastapi.testclient import TestClient
import importlib

app = importlib.import_module("app.main").app
client = TestClient(app)

def test_health_endpoint():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json().get("ok") is True
