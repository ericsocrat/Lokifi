# Lokifi Codex guidance

Treat this as one monorepo: Next.js frontend/admin applications, a FastAPI
backend, and Docker-based integration infrastructure. Read `README.md` and the
relevant documents under `docs/` before changing a subsystem. Verify current
source/branch state instead of trusting historical coverage or CI counts.

## Tool path

- Use root npm scripts and the committed lockfiles for JavaScript work. Use the
  project Python environment with pytest and Ruff for backend work.
- Docker Compose is on-demand for integration work; do not start containers to
  answer a static question. Playwright/browser tools are on-demand for E2E or UI
  evidence. Security scanners are on-demand for explicit security work.
- The legacy/custom coverage MCP under `tools/` is not a default Codex tool;
  prefer its deterministic scripts unless a task specifically requires and
  re-verifies the server.
- Do not add global database/deployment MCPs, generic indexers, or new framework
  tooling by default. Hosted reads may run automatically; writes require
  confirmation.

## Verification

From the repository root, run the smallest relevant checks, then the applicable
combined gates:

```powershell
npm run lint
npm run lint:backend
npm run typecheck
npm run test:all
npm run build
```

Run the frontend Playwright/security/accessibility commands only when their
surfaces change. Report any service-dependent checks not run.
