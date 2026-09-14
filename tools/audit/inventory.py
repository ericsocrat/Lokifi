"""Source inventory of the pinned legacy tree; no imports or service connections."""
import ast
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs/audit"
pages = []
for app in ("frontend", "admin"):
    base = ROOT / "apps" / app / "app"
    for path in sorted(base.rglob("page.tsx")):
        source = path.read_text(encoding="utf-8-sig")
        route = "/" + str(path.relative_to(base).parent).replace("\\", "/").replace(".", "")
        simulated = any(s in source for s in ("mockData", "mockGoals", "mockDebts", "Simulate AI", "Math.random"))
        disposition = "rebuild" if any(s in route for s in ("portfolio", "dashboard", "asset", "login", "settings")) and app == "frontend" else "retire"
        pages.append({"app": app, "route": route, "source": str(path.relative_to(ROOT)), "status": "simulated" if simulated else "untested", "decision": disposition})
routes = []
for path in sorted((ROOT / "apps/backend/app").rglob("*.py")):
    tree = ast.parse(path.read_text(encoding="utf-8-sig"))
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            for d in node.decorator_list:
                if isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute) and d.func.attr in ("get", "post", "put", "patch", "delete", "websocket") and d.args and isinstance(d.args[0], ast.Constant):
                    routes.append({"source":str(path.relative_to(ROOT)), "line":node.lineno, "method":d.func.attr.upper(), "path":d.args[0].value, "function":node.name, "dependencies":ast.unparse(node.args), "status":"untested"})
OUT.mkdir(exist_ok=True, parents=True)
(OUT / "legacy-inventory.json").write_text(json.dumps({"baseline":"e4b1a833765b33ae9d0a46d8b42ebdea3446d73b", "pages":pages,"route_declarations":routes}, indent=2), encoding="utf-8")
text = "# Legacy route inventory\n\nBaseline e4b1a833. Status is conservative: source presence is not runtime verification. API declarations include unregistered modules; consult the audit's wiring map.\n\n| App | Route | State | Decision | Source |\n|---|---|---|---|---|\n"
text += "\n".join(f"| {p['app']} | `{p['route']}` | {p['status']} | {p['decision']} | `{p['source']}` |" for p in pages)
text += "\n\n## API declarations\n\n| Method | Local path | Source | Handler |\n|---|---|---|---|\n"
text += "\n".join(f"| {r['method']} | `{r['path']}` | `{r['source']}:{r['line']}` | `{r['function']}` |" for r in routes)
(OUT / "legacy-inventory.md").write_text(text+"\n", encoding="utf-8")
print(f"Inventoried {len(pages)} pages and {len(routes)} route declarations")
