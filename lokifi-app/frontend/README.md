# Lokifi Frontend

Local development and testing notes

Run dev server:

```powershell
cd frontend
npm install
npm run dev
```

Build and serve production:

```powershell
cd frontend
npm ci
npm run build
# optionally run with next start
npm run start
```

Run tests:

```powershell
cd frontend
npm ci
npx vitest run
```

CI:
- GitHub Actions workflow `./.github/workflows/frontend-ci.yml` runs `npm ci`, `npm run build`, and `npm run test:ci` on push/PR to `main`.
