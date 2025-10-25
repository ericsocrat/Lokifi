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

### Testing the Coverage Dashboard

The coverage dashboard has its own comprehensive test suite:

```powershell
cd frontend
npm run test:dashboard  # Run 103 dashboard-specific tests
```

**What's tested:**

- ✅ 26 sorting function tests (8 sort algorithms)
- ✅ 15 pagination tests (all edge cases)
- ✅ 22 export tests (CSV/JSON generation)
- ✅ 16 debounce timing tests
- ✅ 20 velocity calculation tests
- ✅ 15 heatmap color tests

See [coverage-dashboard/README.md](./coverage-dashboard/README.md) for detailed testing documentation.

CI:

- GitHub Actions workflow `./.github/workflows/frontend-ci.yml` runs `npm ci`, `npm run build`, and `npm run test:ci` on push/PR to `main`.
