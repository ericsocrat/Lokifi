#!/usr/bin/env node

/**
 * Coverage Dashboard Data Generator
 * Generates data.json from Vitest coverage output
 */

const fs = require('fs');
const path = require('path');

const COVERAGE_FINAL = path.join(__dirname, '../coverage/coverage-final.json');
const DASHBOARD_DATA = path.join(__dirname, '../coverage-dashboard/data.json');
const TRENDS_FILE = path.join(__dirname, '../coverage-dashboard/trends.json');

console.log('🔄 Updating coverage dashboard...\n');

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
  lines: { covered: 0, total: 0 }
};

const files = {};

Object.keys(coverageData).forEach(file => {
  const data = coverageData[file];
  
  files[file] = {
    statements: { covered: 0, total: 0 },
    branches: { covered: 0, total: 0 },
    functions: { covered: 0, total: 0 },
    lines: { covered: 0, total: 0 }
  };
  
  if (data.s) {
    const covered = Object.values(data.s).filter(c => c > 0).length;
    const total = Object.keys(data.s).length;
    totals.statements.covered += covered;
    totals.statements.total += total;
    files[file].statements = { covered, total };
  }
  
  if (data.b) {
    let covered = 0, total = 0;
    Object.values(data.b).forEach(branches => {
      total += branches.length;
      covered += branches.filter(c => c > 0).length;
    });
    totals.branches.covered += covered;
    totals.branches.total += total;
    files[file].branches = { covered, total };
  }
  
  if (data.f) {
    const covered = Object.values(data.f).filter(c => c > 0).length;
    const total = Object.keys(data.f).length;
    totals.functions.covered += covered;
    totals.functions.total += total;
    files[file].functions = { covered, total };
  }
  
  if (data.statementMap && data.s) {
    const covered = Object.keys(data.statementMap).filter(k => data.s[k] > 0).length;
    const total = Object.keys(data.statementMap).length;
    totals.lines.covered += covered;
    totals.lines.total += total;
    files[file].lines = { covered, total };
  }
});

const pct = (covered, total) => total > 0 ? (covered / total) * 100 : 0;
const coverage = {
  statements: pct(totals.statements.covered, totals.statements.total),
  branches: pct(totals.branches.covered, totals.branches.total),
  functions: pct(totals.functions.covered, totals.functions.total),
  lines: pct(totals.lines.covered, totals.lines.total)
};

console.log('📊 Coverage:');
console.log(`   Statements: ${coverage.statements.toFixed(2)}%`);
console.log(`   Branches:   ${coverage.branches.toFixed(2)}%`);
console.log(`   Functions:  ${coverage.functions.toFixed(2)}%`);
console.log(`   Lines:      ${coverage.lines.toFixed(2)}%\n`);

// Module breakdown
const mods = {};
Object.keys(files).forEach(file => {
  const parts = file.split('/');
  let name = 'other';
  
  if (parts.includes('lib') && parts[parts.indexOf('lib') + 1]) {
    name = parts[parts.indexOf('lib') + 1];
  } else if (parts.includes('components')) {
    name = 'components';
  } else if (parts.includes('src') || parts.includes('app')) {
    name = 'pages';
  }
  
  if (!mods[name]) {
    mods[name] = { name, files: [], stmtTotal: 0, stmtCovered: 0 };
  }
  
  mods[name].files.push(file);
  mods[name].stmtTotal += files[file].statements.total;
  mods[name].stmtCovered += files[file].statements.covered;
});

const modules = Object.values(mods).map(m => ({
  name: m.name,
  coverage: pct(m.stmtCovered, m.stmtTotal),
  files: m.files.length,
  tests: 0
})).sort((a, b) => a.coverage - b.coverage);

// Coverage gaps
const gaps = [];
Object.keys(files).forEach(file => {
  const f = files[file];
  const linePct = pct(f.lines.covered, f.lines.total);
  
  if (f.lines.total >= 10 && linePct < 60) {
    const priority = linePct < 20 ? 'HIGH' : linePct < 40 ? 'MEDIUM' : 'LOW';
    const shortPath = file.includes('/src/') ? file.substring(file.indexOf('/src/') + 1) : file.split('/').slice(-3).join('/');
    
    gaps.push({
      file: shortPath,
      coverage: parseFloat(linePct.toFixed(1)),
      tests: 0,
      priority,
      lines: f.lines
    });
  }
});

gaps.sort((a, b) => {
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return order[a.priority] !== order[b.priority] 
    ? order[a.priority] - order[b.priority]
    : a.coverage - b.coverage;
});

console.log('🔍 Coverage gaps:', gaps.filter(g => g.priority === 'HIGH').length, 'HIGH,', 
            gaps.filter(g => g.priority === 'MEDIUM').length, 'MEDIUM,',
            gaps.filter(g => g.priority === 'LOW').length, 'LOW\n');

// Trends
let trends = [];
try {
  if (fs.existsSync(TRENDS_FILE)) {
    trends = JSON.parse(fs.readFileSync(TRENDS_FILE, 'utf8'));
  }
} catch (e) {}

trends.push({ timestamp: now, coverage });
if (trends.length > 30) trends = trends.slice(-30);

fs.writeFileSync(TRENDS_FILE, JSON.stringify(trends, null, 2));

// Delta
let delta = null;
if (trends.length >= 2) {
  const prev = trends[trends.length - 2].coverage;
  const curr = trends[trends.length - 1].coverage;
  const arrow = (c, p) => c > p ? '↑' : c < p ? '↓' : '→';
  
  delta = {
    statements: `${arrow(curr.statements, prev.statements)} ${Math.abs(curr.statements - prev.statements).toFixed(1)}%`,
    branches: `${arrow(curr.branches, prev.branches)} ${Math.abs(curr.branches - prev.branches).toFixed(1)}%`,
    functions: `${arrow(curr.functions, prev.functions)} ${Math.abs(curr.functions - prev.functions).toFixed(1)}%`,
    lines: `${arrow(curr.lines, prev.lines)} ${Math.abs(curr.lines - prev.lines).toFixed(1)}%`
  };
}

// Output
const dashboardData = {
  generated: now,
  current: {
    tests: {
      passing: 0,
      skipped: 0,
      failing: 0,
      total: 0,
      files: Object.keys(files).length,
      duration: '-'
    },
    coverage: {
      statements: parseFloat(coverage.statements.toFixed(2)),
      branches: parseFloat(coverage.branches.toFixed(2)),
      functions: parseFloat(coverage.functions.toFixed(2)),
      lines: parseFloat(coverage.lines.toFixed(2))
    }
  },
  modules,
  gaps: gaps.slice(0, 20),
  trends,
  delta
};

const dir = path.dirname(DASHBOARD_DATA);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(DASHBOARD_DATA, JSON.stringify(dashboardData, null, 2));

console.log('✅ Dashboard updated!');
console.log(`📁 ${DASHBOARD_DATA}`);
console.log(`📈 ${TRENDS_FILE}\n`);
console.log('🌐 Open: coverage-dashboard/index.html\n');
