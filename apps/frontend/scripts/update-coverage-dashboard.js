#!/usr/bin/env node

/**
 * Coverage Dashboard Data Generator (Enhanced)
 * Generates comprehensive data.json from Vitest coverage output
 *
 * Features:
 * - Detailed file-level coverage metrics
 * - Smart module categorization
 * - Coverage gap analysis with priorities
 * - Historical trend tracking
 * - Velocity metrics (test count over time)
 * - Complexity scoring
 * - Test recommendations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COVERAGE_FINAL = path.join(__dirname, '../coverage/coverage-final.json');
const DASHBOARD_DATA = path.join(__dirname, '../coverage-dashboard/data.json');
const TRENDS_FILE = path.join(__dirname, '../coverage-dashboard/trends.json');
const METADATA_FILE = path.join(__dirname, '../coverage-dashboard/metadata.json');

console.log('🔄 Updating coverage dashboard...\n');

// Get git information
let gitInfo = {
  branch: 'unknown',
  commit: 'unknown',
  author: 'unknown',
  message: 'unknown',
};

try {
  gitInfo.branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  gitInfo.commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  gitInfo.author = execSync('git log -1 --pretty=format:"%an"', { encoding: 'utf8' }).trim();
  gitInfo.message = execSync('git log -1 --pretty=format:"%s"', { encoding: 'utf8' }).trim();
} catch (e) {
  console.warn('⚠️  Could not get git info:', e.message);
}

// Get test results from vitest output if available
let testResults = {
  passing: 0,
  skipped: 0,
  failing: 0,
  total: 0,
  duration: '-',
};

try {
  const testOutputFile = path.join(__dirname, '../test-output.log');
  if (fs.existsSync(testOutputFile)) {
    const output = fs.readFileSync(testOutputFile, 'utf8');
    const passMatch = output.match(/(\d+) passed/);
    const skipMatch = output.match(/(\d+) skipped/);
    const failMatch = output.match(/(\d+) failed/);
    const durationMatch = output.match(/Duration\s+([\d.]+s)/);

    if (passMatch) testResults.passing = parseInt(passMatch[1]);
    if (skipMatch) testResults.skipped = parseInt(skipMatch[1]);
    if (failMatch) testResults.failing = parseInt(failMatch[1]);
    if (durationMatch) testResults.duration = durationMatch[1];
    testResults.total = testResults.passing + testResults.skipped + testResults.failing;
  }
} catch (e) {
  console.warn('⚠️  Could not parse test results');
}

if (!fs.existsSync(COVERAGE_FINAL)) {
  console.error('❌ Coverage not found! Run: npm run test:coverage\n');
  process.exit(1);
}

const coverageData = JSON.parse(fs.readFileSync(COVERAGE_FINAL, 'utf8'));
const now = new Date().toISOString();

// Calculate totals
let totals = {
  statements: { covered: 0, total: 0 },
  branches: { covered: 0, total: 0 },
  functions: { covered: 0, total: 0 },
  lines: { covered: 0, total: 0 },
};

const files = {};

Object.keys(coverageData).forEach((file) => {
  const data = coverageData[file];

  files[file] = {
    statements: { covered: 0, total: 0 },
    branches: { covered: 0, total: 0 },
    functions: { covered: 0, total: 0 },
    lines: { covered: 0, total: 0 },
  };

  if (data.s) {
    const covered = Object.values(data.s).filter((c) => c > 0).length;
    const total = Object.keys(data.s).length;
    totals.statements.covered += covered;
    totals.statements.total += total;
    files[file].statements = { covered, total };
  }

  if (data.b) {
    let covered = 0,
      total = 0;
    Object.values(data.b).forEach((branches) => {
      total += branches.length;
      covered += branches.filter((c) => c > 0).length;
    });
    totals.branches.covered += covered;
    totals.branches.total += total;
    files[file].branches = { covered, total };
  }

  if (data.f) {
    const covered = Object.values(data.f).filter((c) => c > 0).length;
    const total = Object.keys(data.f).length;
    totals.functions.covered += covered;
    totals.functions.total += total;
    files[file].functions = { covered, total };
  }

  if (data.statementMap && data.s) {
    const covered = Object.keys(data.statementMap).filter((k) => data.s[k] > 0).length;
    const total = Object.keys(data.statementMap).length;
    totals.lines.covered += covered;
    totals.lines.total += total;
    files[file].lines = { covered, total };
  }
});

const pct = (covered, total) => (total > 0 ? (covered / total) * 100 : 0);
const coverage = {
  statements: pct(totals.statements.covered, totals.statements.total),
  branches: pct(totals.branches.covered, totals.branches.total),
  functions: pct(totals.functions.covered, totals.functions.total),
  lines: pct(totals.lines.covered, totals.lines.total),
};

console.log('📊 Coverage:');
console.log(`   Statements: ${coverage.statements.toFixed(2)}%`);
console.log(`   Branches:   ${coverage.branches.toFixed(2)}%`);
console.log(`   Functions:  ${coverage.functions.toFixed(2)}%`);
console.log(`   Lines:      ${coverage.lines.toFixed(2)}%\n`);

// Module breakdown with enhanced categorization
const mods = {};
const fileDetails = [];

Object.keys(files).forEach((file) => {
  const parts = file.split('/');
  let category = 'other';
  let subcategory = null;

  // Smart categorization
  if (parts.includes('lib')) {
    const libIndex = parts.indexOf('lib');
    category = 'lib';
    subcategory = parts[libIndex + 1] || 'core';
  } else if (parts.includes('components')) {
    category = 'components';
    const compIndex = parts.indexOf('components');
    subcategory = parts[compIndex + 1] || 'ui';
  } else if (parts.includes('hooks')) {
    category = 'hooks';
  } else if (parts.includes('stores')) {
    category = 'stores';
  } else if (parts.includes('utils')) {
    category = 'utils';
  } else if (parts.includes('pages') || parts.includes('app')) {
    category = 'pages';
  } else if (parts.includes('services')) {
    category = 'services';
  } else if (parts.includes('types')) {
    category = 'types';
  }

  const moduleName = subcategory ? `${category}/${subcategory}` : category;

  if (!mods[moduleName]) {
    mods[moduleName] = {
      name: moduleName,
      category,
      subcategory,
      files: [],
      stmtTotal: 0,
      stmtCovered: 0,
      branchTotal: 0,
      branchCovered: 0,
      funcTotal: 0,
      funcCovered: 0,
      lineTotal: 0,
      lineCovered: 0,
    };
  }

  const f = files[file];
  mods[moduleName].files.push(file);
  mods[moduleName].stmtTotal += f.statements.total;
  mods[moduleName].stmtCovered += f.statements.covered;
  mods[moduleName].branchTotal += f.branches.total;
  mods[moduleName].branchCovered += f.branches.covered;
  mods[moduleName].funcTotal += f.functions.total;
  mods[moduleName].funcCovered += f.functions.covered;
  mods[moduleName].lineTotal += f.lines.total;
  mods[moduleName].lineCovered += f.lines.covered;

  // File-level details for insights
  const linePct = pct(f.lines.covered, f.lines.total);
  const complexity = f.branches.total + f.functions.total; // Simple complexity metric

  fileDetails.push({
    path: file,
    module: moduleName,
    coverage: {
      statements: pct(f.statements.covered, f.statements.total),
      branches: pct(f.branches.covered, f.branches.total),
      functions: pct(f.functions.covered, f.functions.total),
      lines: linePct,
    },
    metrics: {
      statements: f.statements.total,
      branches: f.branches.total,
      functions: f.functions.total,
      lines: f.lines.total,
      complexity,
    },
    health: linePct >= 80 ? 'good' : linePct >= 60 ? 'fair' : linePct >= 40 ? 'poor' : 'critical',
  });
});

const modules = Object.values(mods)
  .map((m) => ({
    name: m.name,
    category: m.category,
    subcategory: m.subcategory,
    coverage: {
      statements: pct(m.stmtCovered, m.stmtTotal),
      branches: pct(m.branchCovered, m.branchTotal),
      functions: pct(m.funcCovered, m.funcTotal),
      lines: pct(m.lineCovered, m.lineTotal),
    },
    files: m.files.length,
    metrics: {
      totalLines: m.lineTotal,
      coveredLines: m.lineCovered,
      uncoveredLines: m.lineTotal - m.lineCovered,
    },
    health:
      pct(m.lineCovered, m.lineTotal) >= 80
        ? 'good'
        : pct(m.lineCovered, m.lineTotal) >= 60
          ? 'fair'
          : pct(m.lineCovered, m.lineTotal) >= 40
            ? 'poor'
            : 'critical',
  }))
  .sort((a, b) => a.coverage.lines - b.coverage.lines);

// Coverage gaps with enhanced analysis
const gaps = [];
const recommendations = [];

Object.keys(files).forEach((file) => {
  const f = files[file];
  const linePct = pct(f.lines.covered, f.lines.total);
  const branchPct = pct(f.branches.covered, f.branches.total);
  const funcPct = pct(f.functions.covered, f.functions.total);

  // Calculate impact score (lines * complexity)
  const complexity = f.branches.total + f.functions.total;
  const impact = f.lines.total * (1 + complexity / 100);

  if (f.lines.total >= 10 && linePct < 60) {
    const priority = linePct < 20 ? 'HIGH' : linePct < 40 ? 'MEDIUM' : 'LOW';
    const shortPath = file.includes('/src/')
      ? file.substring(file.indexOf('/src/') + 1)
      : file.split('/').slice(-3).join('/');

    gaps.push({
      file: shortPath,
      fullPath: file,
      coverage: parseFloat(linePct.toFixed(1)),
      details: {
        lines: linePct.toFixed(1),
        branches: branchPct.toFixed(1),
        functions: funcPct.toFixed(1),
      },
      metrics: {
        totalLines: f.lines.total,
        uncoveredLines: f.lines.total - f.lines.covered,
        complexity,
        impact: Math.round(impact),
      },
      priority,
      reason:
        linePct === 0
          ? 'No coverage'
          : linePct < 20
            ? 'Critical - Very low coverage'
            : linePct < 40
              ? 'High priority - Low coverage'
              : 'Medium priority - Needs improvement',
    });

    // Generate recommendations for high-impact files
    if (priority === 'HIGH' && impact > 100) {
      recommendations.push({
        file: shortPath,
        priority: 'HIGH',
        reason: `High impact file with ${f.lines.total} lines and ${linePct.toFixed(1)}% coverage`,
        actions: [
          `Add ${Math.ceil(f.lines.total * 0.8 - f.lines.covered)} lines of test coverage`,
          `Focus on ${f.functions.total - f.functions.covered} untested functions`,
          `Cover ${f.branches.total - f.branches.covered} untested branches`,
        ],
      });
    }
  }
});

gaps.sort((a, b) => {
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  if (order[a.priority] !== order[b.priority]) {
    return order[a.priority] - order[b.priority];
  }
  // Secondary sort by impact
  return b.metrics.impact - a.metrics.impact;
});

console.log(
  '🔍 Coverage gaps:',
  gaps.filter((g) => g.priority === 'HIGH').length,
  'HIGH,',
  gaps.filter((g) => g.priority === 'MEDIUM').length,
  'MEDIUM,',
  gaps.filter((g) => g.priority === 'LOW').length,
  'LOW\n'
);

if (recommendations.length > 0) {
  console.log(`💡 Generated ${recommendations.length} actionable recommendations\n`);
}

// Trends with velocity tracking
let trends = [];
let metadata = {
  totalRuns: 0,
  firstRun: now,
  lastRun: now,
  bestCoverage: coverage,
  worstCoverage: coverage,
};

try {
  if (fs.existsSync(TRENDS_FILE)) {
    trends = JSON.parse(fs.readFileSync(TRENDS_FILE, 'utf8'));
  }
  if (fs.existsSync(METADATA_FILE)) {
    metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
  }
} catch (e) {
  console.warn('⚠️  Could not load existing trends/metadata');
}

trends.push({
  timestamp: now,
  coverage,
  tests: testResults.total,
  files: Object.keys(files).length,
  git: {
    branch: gitInfo.branch,
    commit: gitInfo.commit,
  },
});

if (trends.length > 30) trends = trends.slice(-30);

// Update metadata
metadata.totalRuns = (metadata.totalRuns || 0) + 1;
metadata.lastRun = now;
if (!metadata.firstRun) metadata.firstRun = now;

// Track best/worst coverage
if (!metadata.bestCoverage || coverage.lines > metadata.bestCoverage.lines) {
  metadata.bestCoverage = { ...coverage, timestamp: now };
}
if (!metadata.worstCoverage || coverage.lines < metadata.worstCoverage.lines) {
  metadata.worstCoverage = { ...coverage, timestamp: now };
}

// Calculate velocity (tests added per day)
if (trends.length >= 2) {
  const first = new Date(trends[0].timestamp);
  const last = new Date(now);
  const days = Math.max(1, (last - first) / (1000 * 60 * 60 * 24));
  const testDelta = testResults.total - trends[0].tests;
  metadata.velocity = {
    testsPerDay: (testDelta / days).toFixed(1),
    filesPerRun: (Object.keys(files).length / trends.length).toFixed(1),
    avgCoverageGain: ((coverage.lines - trends[0].coverage.lines) / trends.length).toFixed(2),
  };
}

fs.writeFileSync(TRENDS_FILE, JSON.stringify(trends, null, 2));
fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));

// Delta with detailed breakdown
let delta = null;
let weeklyTrend = null;

if (trends.length >= 2) {
  const prev = trends[trends.length - 2].coverage;
  const curr = trends[trends.length - 1].coverage;
  const arrow = (c, p) => (c > p ? '↑' : c < p ? '↓' : '→');
  const color = (c, p) => (c > p ? 'green' : c < p ? 'red' : 'gray');

  delta = {
    statements: {
      text: `${arrow(curr.statements, prev.statements)} ${Math.abs(curr.statements - prev.statements).toFixed(2)}%`,
      value: curr.statements - prev.statements,
      direction: arrow(curr.statements, prev.statements),
      color: color(curr.statements, prev.statements),
    },
    branches: {
      text: `${arrow(curr.branches, prev.branches)} ${Math.abs(curr.branches - prev.branches).toFixed(2)}%`,
      value: curr.branches - prev.branches,
      direction: arrow(curr.branches, prev.branches),
      color: color(curr.branches, prev.branches),
    },
    functions: {
      text: `${arrow(curr.functions, prev.functions)} ${Math.abs(curr.functions - prev.functions).toFixed(2)}%`,
      value: curr.functions - prev.functions,
      direction: arrow(curr.functions, prev.functions),
      color: color(curr.functions, prev.functions),
    },
    lines: {
      text: `${arrow(curr.lines, prev.lines)} ${Math.abs(curr.lines - prev.lines).toFixed(2)}%`,
      value: curr.lines - prev.lines,
      direction: arrow(curr.lines, prev.lines),
      color: color(curr.lines, prev.lines),
    },
  };

  // Weekly trend (if we have 7+ data points)
  if (trends.length >= 7) {
    const weekAgo = trends[trends.length - 7].coverage;
    weeklyTrend = {
      statements: curr.statements - weekAgo.statements,
      branches: curr.branches - weekAgo.branches,
      functions: curr.functions - weekAgo.functions,
      lines: curr.lines - weekAgo.lines,
    };
  }
}

// Quality insights
const insights = [];

// Coverage insights
if (coverage.lines < 50) {
  insights.push({
    type: 'warning',
    category: 'coverage',
    message: 'Overall coverage is below 50%. Focus on writing more tests.',
    priority: 'high',
  });
}

if (coverage.branches > 80 && coverage.lines < 50) {
  insights.push({
    type: 'info',
    category: 'coverage',
    message:
      'Branch coverage is excellent but line coverage is low. Focus on covering more code paths.',
    priority: 'medium',
  });
}

// Module insights
const criticalModules = modules.filter((m) => m.health === 'critical');
if (criticalModules.length > 0) {
  insights.push({
    type: 'warning',
    category: 'modules',
    message: `${criticalModules.length} module(s) have critical coverage (<40%): ${criticalModules
      .slice(0, 3)
      .map((m) => m.name)
      .join(', ')}`,
    priority: 'high',
  });
}

// Trend insights
if (delta && delta.lines.value < -2) {
  insights.push({
    type: 'error',
    category: 'regression',
    message: `Coverage decreased by ${Math.abs(delta.lines.value).toFixed(2)}% since last run. Review recent changes.`,
    priority: 'critical',
  });
} else if (delta && delta.lines.value > 2) {
  insights.push({
    type: 'success',
    category: 'improvement',
    message: `Coverage improved by ${delta.lines.value.toFixed(2)}%! Great work! 🎉`,
    priority: 'info',
  });
}

// Velocity insights
if (metadata.velocity && parseFloat(metadata.velocity.testsPerDay) < 1) {
  insights.push({
    type: 'info',
    category: 'velocity',
    message: 'Test velocity is low. Consider increasing test writing frequency.',
    priority: 'low',
  });
}

// Output with comprehensive data
const dashboardData = {
  version: '2.0.0',
  generated: now,
  git: gitInfo,
  current: {
    tests: {
      passing: testResults.passing,
      skipped: testResults.skipped,
      failing: testResults.failing,
      total: testResults.total,
      files: Object.keys(files).length,
      duration: testResults.duration,
    },
    coverage: {
      statements: parseFloat(coverage.statements.toFixed(2)),
      branches: parseFloat(coverage.branches.toFixed(2)),
      functions: parseFloat(coverage.functions.toFixed(2)),
      lines: parseFloat(coverage.lines.toFixed(2)),
    },
    totals: {
      statements: { covered: totals.statements.covered, total: totals.statements.total },
      branches: { covered: totals.branches.covered, total: totals.branches.total },
      functions: { covered: totals.functions.covered, total: totals.functions.total },
      lines: { covered: totals.lines.covered, total: totals.lines.total },
    },
  },
  modules,
  gaps: gaps.slice(0, 50), // Increased from 20 to 50
  recommendations: recommendations.slice(0, 10),
  trends,
  delta,
  weeklyTrend,
  metadata,
  insights,
  summary: {
    totalFiles: Object.keys(files).length,
    totalModules: modules.length,
    criticalGaps: gaps.filter((g) => g.priority === 'HIGH').length,
    mediumGaps: gaps.filter((g) => g.priority === 'MEDIUM').length,
    lowGaps: gaps.filter((g) => g.priority === 'LOW').length,
    healthyFiles: fileDetails.filter((f) => f.health === 'good').length,
    criticalFiles: fileDetails.filter((f) => f.health === 'critical').length,
    avgComplexity: Math.round(
      fileDetails.reduce((sum, f) => sum + f.metrics.complexity, 0) / fileDetails.length
    ),
  },
  topFiles: {
    bestCoverage: fileDetails
      .filter((f) => f.coverage.lines > 0)
      .sort((a, b) => b.coverage.lines - a.coverage.lines)
      .slice(0, 10)
      .map((f) => ({
        path: f.path,
        coverage: f.coverage.lines.toFixed(1),
        health: f.health,
      })),
    worstCoverage: fileDetails
      .filter((f) => f.metrics.lines >= 10)
      .sort((a, b) => a.coverage.lines - b.coverage.lines)
      .slice(0, 10)
      .map((f) => ({
        path: f.path,
        coverage: f.coverage.lines.toFixed(1),
        uncovered: f.metrics.lines - Math.round((f.metrics.lines * f.coverage.lines) / 100),
        complexity: f.metrics.complexity,
      })),
    mostComplex: fileDetails
      .sort((a, b) => b.metrics.complexity - a.metrics.complexity)
      .slice(0, 10)
      .map((f) => ({
        path: f.path,
        complexity: f.metrics.complexity,
        coverage: f.coverage.lines.toFixed(1),
        branches: f.metrics.branches,
        functions: f.metrics.functions,
      })),
  },
};

const dir = path.dirname(DASHBOARD_DATA);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(DASHBOARD_DATA, JSON.stringify(dashboardData, null, 2));

console.log('✅ Dashboard updated!');
console.log(`📁 ${DASHBOARD_DATA}`);
console.log(`📈 ${TRENDS_FILE}`);
console.log(`📊 ${METADATA_FILE}\n`);

// Summary statistics
console.log('📊 Summary:');
console.log(`   Total Files: ${dashboardData.summary.totalFiles}`);
console.log(`   Modules: ${dashboardData.summary.totalModules}`);
console.log(`   Critical Gaps: ${dashboardData.summary.criticalGaps}`);
console.log(`   Healthy Files: ${dashboardData.summary.healthyFiles}`);
console.log(`   Avg Complexity: ${dashboardData.summary.avgComplexity}`);

if (metadata.velocity) {
  console.log(`\n📈 Velocity:`);
  console.log(`   Tests/Day: ${metadata.velocity.testsPerDay}`);
  console.log(`   Coverage Gain/Run: ${metadata.velocity.avgCoverageGain}%`);
}

if (insights.length > 0) {
  console.log(`\n💡 Key Insights:`);
  insights.slice(0, 3).forEach((insight) => {
    const icon =
      insight.type === 'error'
        ? '🔴'
        : insight.type === 'warning'
          ? '🟡'
          : insight.type === 'success'
            ? '🟢'
            : '🔵';
    console.log(`   ${icon} ${insight.message}`);
  });
}

console.log('\n🌐 View: coverage-dashboard/index.html');
console.log('💡 Serve: npx serve coverage-dashboard\n');
