# Phase 1.5.5: Coverage Dashboard - Visual HTML Reports

**Status:** 🚀 IN PROGRESS  
**Estimated Time:** 30 minutes  
**Started:** October 14, 2025, 08:40 AM

---

## Objectives

Create an interactive HTML dashboard to visualize test coverage:
1. **Coverage Overview** - Current metrics with visual gauges
2. **Trend Visualization** - Historical coverage trends with charts
3. **Module Breakdown** - Per-module coverage with drill-down
4. **Coverage Diff** - Compare coverage between commits
5. **Gap Identification** - Highlight files needing tests

---

## Implementation Plan

### Step 1: Dashboard HTML Template (10 min)

**Goal:** Create base HTML template with Chart.js

**Features:**
- Responsive design (mobile-friendly)
- Dark/light theme toggle
- Modern UI with Tailwind CSS (CDN)
- Chart.js for visualizations
- Interactive elements

**Sections:**
1. Header with current coverage metrics
2. Trend charts (line graphs)
3. Module breakdown (bar charts)
4. File list with coverage status
5. Quick actions (refresh, export)

### Step 2: Data Generator (10 min)

**Goal:** PowerShell function to generate dashboard data

**Tasks:**
1. Create `New-CoverageDashboard` function
2. Read coverage history from `.coverage-history/`
3. Aggregate data by module
4. Calculate trends and deltas
5. Generate JSON data for dashboard
6. Inject data into HTML template

**Data Structure:**
```json
{
  "generated": "2025-10-14T08:40:00Z",
  "current": {
    "statements": 12.3,
    "branches": 75.11,
    "functions": 63.31,
    "tests": 224
  },
  "trends": [
    { "date": "2025-10-07", "statements": 11.5, "tests": 187 },
    { "date": "2025-10-14", "statements": 12.3, "tests": 224 }
  ],
  "modules": [
    { "name": "utils", "coverage": 95, "files": 7, "tests": 127 },
    { "name": "stores", "coverage": 45, "files": 3, "tests": 6 },
    { "name": "charts", "coverage": 38, "files": 4, "tests": 30 }
  ],
  "gaps": [
    { "file": "src/lib/utils/adapter.ts", "coverage": 33 },
    { "file": "src/lib/utils/timeframes.ts", "coverage": 30 }
  ]
}
```

### Step 3: Integration with Lokifi Bot (5 min)

**Goal:** Add dashboard command to lokifi.ps1

**Tasks:**
1. Add `dashboard` to ValidateSet
2. Create handler for `.\lokifi.ps1 dashboard`
3. Options:
   - `-Open`: Generate and open in browser
   - `-Export`: Save to file only
   - `-Watch`: Auto-refresh mode

**Commands:**
```powershell
.\lokifi.ps1 dashboard              # Generate and open
.\lokifi.ps1 dashboard -Export      # Save to file
.\lokifi.ps1 dashboard -Watch       # Auto-refresh every 30s
```

### Step 4: Auto-Refresh Feature (5 min)

**Goal:** Enable live updates during development

**Implementation:**
- JavaScript polling (every 5 seconds)
- Fetch updated data from JSON file
- Update charts without page reload
- Show last update timestamp

---

## File Structure

```
tools/
├── lokifi.ps1                           # Updated with dashboard command
└── scripts/
    ├── test-intelligence.ps1            # Existing
    └── coverage-dashboard.ps1           # NEW

apps/frontend/
├── .coverage-history/                   # Existing
│   ├── *.json
│   └── latest.json
└── coverage-dashboard/                  # NEW
    ├── index.html                       # Dashboard template
    ├── data.json                        # Generated data
    └── assets/
        └── logo.svg                     # Optional branding
```

---

## Dashboard Features

### 1. Coverage Overview (Hero Section)

**Gauges for:**
- Statements: 12.3% (target: 25%)
- Branches: 75.11% (target: 85%)
- Functions: 63.31% (target: 70%)
- Tests: 224 tests

**Visual:**
- Circular progress bars
- Color-coded (red/yellow/green)
- Shows delta from last snapshot

### 2. Trend Charts

**Line Graph:**
- X-axis: Date (last 30 days)
- Y-axis: Coverage %
- Multiple lines: statements, branches, functions
- Hover tooltips with exact values

**Bar Graph:**
- X-axis: Date
- Y-axis: Test count
- Shows test growth over time

### 3. Module Breakdown

**Horizontal Bar Chart:**
```
utils     ████████████████░░  95%  (7 files, 127 tests)
stores    ████████░░░░░░░░░░  45%  (3 files, 6 tests)
charts    ███████░░░░░░░░░░░  38%  (4 files, 30 tests)
api       ████░░░░░░░░░░░░░░  25%  (11 files, 16 tests)
```

**Interactive:**
- Click to drill-down into module
- Shows file-level coverage
- Link to source file

### 4. Coverage Gaps

**Table:**
| File | Coverage | Tests | Priority |
|------|----------|-------|----------|
| adapter.ts | 33% | 0 | 🔴 HIGH |
| timeframes.ts | 30% | 0 | 🔴 HIGH |
| chartUtils.ts | 45% | 1 | 🟡 MEDIUM |

**Actions:**
- "Create Test" button (generates template)
- Link to test-impact analysis
- Show complexity score

### 5. Quick Actions

**Buttons:**
- 🔄 Refresh Data
- 📥 Export Report (PDF)
- 📊 Run Coverage Analysis
- 🧪 Run Tests
- 🎯 Test Suggestions

---

## Implementation Details

### HTML Template Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lokifi Coverage Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="bg-gray-900 text-white">
    <!-- Header -->
    <header class="bg-gray-800 p-6">
        <h1 class="text-3xl font-bold">📊 Test Coverage Dashboard</h1>
        <p class="text-gray-400">Last updated: <span id="lastUpdate"></span></p>
    </header>

    <!-- Coverage Overview -->
    <section class="p-6 grid grid-cols-4 gap-4">
        <div class="bg-gray-800 p-6 rounded-lg">
            <h3>Statements</h3>
            <div id="statementsGauge"></div>
        </div>
        <!-- ... more gauges -->
    </section>

    <!-- Trend Charts -->
    <section class="p-6">
        <h2 class="text-2xl mb-4">Coverage Trends</h2>
        <canvas id="trendChart"></canvas>
    </section>

    <!-- Module Breakdown -->
    <section class="p-6">
        <h2 class="text-2xl mb-4">Module Coverage</h2>
        <canvas id="moduleChart"></canvas>
    </section>

    <!-- Coverage Gaps -->
    <section class="p-6">
        <h2 class="text-2xl mb-4">Coverage Gaps</h2>
        <table id="gapsTable" class="w-full"></table>
    </section>

    <script>
        // Load data and render charts
        fetch('data.json')
            .then(r => r.json())
            .then(data => renderDashboard(data));
    </script>
</body>
</html>
```

### PowerShell Function

```powershell
function New-CoverageDashboard {
    param(
        [switch]$Open,
        [switch]$Export,
        [switch]$Watch
    )

    # Read coverage history
    $historyDir = "apps/frontend/.coverage-history"
    $history = Get-ChildItem $historyDir -Filter "*.json" |
        Sort-Object Name -Descending |
        Select-Object -First 30 |
        ForEach-Object { Get-Content $_.FullName | ConvertFrom-Json }

    # Aggregate by module
    $modules = Get-ModuleCoverage

    # Find gaps
    $gaps = Get-CoverageGaps

    # Generate data.json
    $data = @{
        generated = (Get-Date -Format "o")
        current = $history[0]
        trends = $history | Select-Object -Property date, statements, branches, tests
        modules = $modules
        gaps = $gaps
    }

    $dashboardDir = "apps/frontend/coverage-dashboard"
    New-Item -ItemType Directory -Path $dashboardDir -Force | Out-Null
    
    $data | ConvertTo-Json -Depth 10 | Set-Content "$dashboardDir/data.json"

    # Copy HTML template
    Copy-Item "tools/templates/dashboard.html" "$dashboardDir/index.html"

    if ($Open) {
        Start-Process "$dashboardDir/index.html"
    }

    if ($Watch) {
        while ($true) {
            Start-Sleep -Seconds 30
            # Regenerate data
        }
    }
}
```

---

## Chart.js Configuration

### Trend Line Chart

```javascript
new Chart(ctx, {
    type: 'line',
    data: {
        labels: data.trends.map(t => t.date),
        datasets: [
            {
                label: 'Statements',
                data: data.trends.map(t => t.statements),
                borderColor: 'rgb(59, 130, 246)',
                tension: 0.4
            },
            {
                label: 'Branches',
                data: data.trends.map(t => t.branches),
                borderColor: 'rgb(16, 185, 129)',
                tension: 0.4
            }
        ]
    },
    options: {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            tooltip: { mode: 'index' }
        },
        scales: {
            y: { beginAtZero: true, max: 100 }
        }
    }
});
```

### Module Bar Chart

```javascript
new Chart(ctx, {
    type: 'bar',
    data: {
        labels: data.modules.map(m => m.name),
        datasets: [{
            label: 'Coverage %',
            data: data.modules.map(m => m.coverage),
            backgroundColor: data.modules.map(m => 
                m.coverage >= 70 ? 'rgb(16, 185, 129)' :
                m.coverage >= 50 ? 'rgb(251, 191, 36)' : 
                'rgb(239, 68, 68)'
            )
        }]
    },
    options: {
        indexAxis: 'y',
        responsive: true
    }
});
```

---

## Expected Outcomes

### Visual Dashboard Features

**Before Phase 1.5.5:**
- ❌ No visual coverage representation
- ❌ Hard to see trends
- ❌ No module breakdown
- ❌ Manual gap analysis

**After Phase 1.5.5:**
- ✅ Beautiful interactive dashboard
- ✅ Visual trend graphs
- ✅ Module drill-down
- ✅ Automated gap detection
- ✅ One-click refresh

### User Experience

**Opening Dashboard:**
```bash
.\lokifi.ps1 dashboard

# Opens browser with:
# - Current coverage gauges
# - 30-day trend charts
# - Module breakdown
# - Coverage gaps table
# - Quick action buttons
```

**Auto-Refresh Mode:**
```bash
.\lokifi.ps1 dashboard -Watch

# Dashboard auto-updates every 30s
# Perfect for TDD workflow
# See coverage increase in real-time
```

---

## Success Metrics

### Functionality
- [ ] HTML dashboard generates correctly
- [ ] Charts render with real data
- [ ] Trends show historical data
- [ ] Module breakdown accurate
- [ ] Coverage gaps identified
- [ ] Auto-refresh works

### Visual Quality
- [ ] Responsive design (mobile + desktop)
- [ ] Professional appearance
- [ ] Color-coded metrics (red/yellow/green)
- [ ] Smooth animations
- [ ] Interactive elements

### Performance
- [ ] Dashboard generates in <2s
- [ ] Charts render in <500ms
- [ ] Auto-refresh updates seamlessly
- [ ] File size <500KB

---

## Testing Plan

### Manual Testing

1. **Generate Dashboard:**
   ```bash
   .\lokifi.ps1 dashboard
   
   # Verify:
   # - Opens in default browser
   # - Shows current coverage
   # - Charts render correctly
   ```

2. **Check Data Accuracy:**
   ```bash
   # Compare dashboard numbers to vitest output
   npm run test:coverage
   
   # Verify metrics match
   ```

3. **Test Auto-Refresh:**
   ```bash
   .\lokifi.ps1 dashboard -Watch
   
   # Run tests in another terminal
   # Verify dashboard updates
   ```

4. **Test Responsive Design:**
   - Resize browser window
   - Check mobile viewport
   - Verify charts resize

### Automated Testing

- Validate generated JSON schema
- Test with missing history files
- Test with empty coverage data
- Verify HTML template integrity

---

## Next Steps After Completion

1. ✅ Complete Phase 1.5.5 (this phase)
2. 🔜 Phase 1.5.6: Security Automation
3. 🔜 Phase 1.5.7: Auto-Documentation
4. 🔜 Phase 1.5.8: CI/CD Integration

---

## Notes

- Use Chart.js for visualizations (lightweight, no build step)
- Tailwind CSS via CDN (no npm dependencies)
- Keep dashboard self-contained (single HTML file)
- Store in git-ignored directory (optional)
- Consider adding PDF export feature (future)

---

**Let's build it!** 📊✨
