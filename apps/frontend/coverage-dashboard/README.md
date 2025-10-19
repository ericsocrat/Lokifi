# 📊 Lokifi Coverage Dashboard

A beautiful, interactive test coverage dashboard for the Lokifi frontend application.

## 🚀 Quick Start

### Generate Fresh Coverage Data

```bash
cd apps/frontend
npm run test:coverage
```

This will:
- ✅ Run all Vitest tests
- ✅ Generate coverage reports
- ✅ Auto-update dashboard data (`data.json`)
- ✅ Track trends over time

### View the Dashboard

**Option 1: Serve Locally (Recommended)**
```bash
cd apps/frontend
npx serve coverage-dashboard
```
Then open the URL shown (usually `http://localhost:3000`)

**Option 2: Use http-server**
```bash
cd apps/frontend
npx http-server coverage-dashboard -p 8080 -o
```

**Option 3: View on GitHub Pages** (after deployment)
Visit: `https://<username>.github.io/<repo>/dashboard/`

## 📋 Features

### 📊 Real-Time Metrics
- **4 Coverage Gauges**: Statements, Branches, Functions, Lines
- **Visual Color Coding**:
  - 🟢 Green: ≥80% (Excellent)
  - 🟡 Yellow: 60-80% (Good)
  - 🟠 Orange: 40-60% (Fair)
  - 🔴 Red: <40% (Needs Work)

### 📈 Trend Tracking
- Historical coverage over last 30 runs
- Delta indicators (↑ improved, ↓ decreased)
- Automatic trend data persistence

### 🎯 Coverage Gaps Analysis
- Prioritized file list (HIGH/MEDIUM/LOW)
- Quick "Analyze" button for detailed inspection
- Sorted by priority and coverage percentage

### ⚡ Quick Actions
- **🔄 Refresh Data**: Reload dashboard
- **📊 Run Coverage**: Instructions to generate fresh data
- **🧪 Run Tests**: Test execution commands
- **💡 Test Suggestions**: Strategic guidance based on current gaps
- **📋 Export Report**: Print/PDF export

## 🛠️ How It Works

### Data Generation Pipeline

1. **Tests Run**: `npm run test:coverage`
2. **Vitest Coverage**: Generates `coverage/coverage-final.json`
3. **Auto-Update Script**: `scripts/update-coverage-dashboard.js` processes coverage
4. **Output**:
   - `coverage-dashboard/data.json` - Current metrics
   - `coverage-dashboard/trends.json` - Historical data

### Automation

The dashboard updates automatically:
- ✅ Every time you run `npm run test:coverage`
- ✅ In CI/CD pipelines (deployed to GitHub Pages)
- ✅ Tracks trends automatically (no manual work!)

## 📁 Files

```
coverage-dashboard/
├── index.html           # Dashboard UI (Tailwind CSS + Chart.js)
├── data.json            # Current coverage metrics (auto-generated)
├── trends.json          # Historical trends (auto-generated)
└── README.md            # This file
```

## 🎨 Customization

The dashboard uses:
- **Tailwind CSS** for styling (dark theme)
- **Chart.js** for visualizations
- **Vanilla JavaScript** for interactivity

To customize:
1. Edit `index.html` for UI changes
2. Modify `scripts/update-coverage-dashboard.js` for data processing logic

## 🐛 Troubleshooting

### Dashboard shows "No data"

**Cause**: `data.json` doesn't exist or can't be loaded

**Solution**:
```bash
cd apps/frontend
npm run test:coverage
```

### CORS errors when opening index.html directly

**Cause**: Browsers block local file access for security

**Solution**: Serve the dashboard instead of opening the file directly
```bash
npx serve coverage-dashboard
```

### Trends not showing

**Cause**: Only 1 data point exists (need at least 2 for trends)

**Solution**: Run coverage multiple times to build history

## 📊 Coverage Goals

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Statements | ~11% | 80% | 🔴 Needs Work |
| Branches | ~89% | 80% | 🟢 Excellent |
| Functions | ~85% | 80% | 🟢 Excellent |
| Lines | ~11% | 80% | 🔴 Needs Work |

**Priority**: Focus on statement and line coverage!

## 🚀 Next Steps

1. ✅ Generate coverage: `npm run test:coverage`
2. ✅ Serve dashboard: `npx serve coverage-dashboard`
3. 📊 Review coverage gaps table
4. 🎯 Start with HIGH priority files
5. ✅ Write tests for uncovered code
6. 🔄 Re-run coverage to track progress

## 📝 Tips

- **Focus on HIGH priority** gaps first (files with <20% coverage)
- **Use the Analyze button** to see detailed line-by-line coverage
- **Run coverage frequently** to build meaningful trends
- **Aim for 80%+** on critical modules (lib/api, lib/stores)
- **Check detailed report** at `coverage/index.html` for line-level details

## 🤝 Contributing

When adding features:
1. Update tests first
2. Run `npm run test:coverage`
3. Check dashboard for new gaps
4. Write tests for new code
5. Verify coverage improved

---

**Built with ❤️ by the Lokifi Team**

*Powered by Vitest, Chart.js, and Tailwind CSS*
