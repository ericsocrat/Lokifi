#!/usr/bin/env node
/* eslint-disable no-console -- CLI script requires console output for user feedback */
/**
 * Recover historical trends from git history
 * Merges all unique trend entries and properly sorts them by timestamp
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get the git root directory
const gitRoot = path.resolve(__dirname, '../../..');
const TRENDS_FILE = path.join(__dirname, '../coverage-dashboard/trends.json');
const DATA_FILE = path.join(__dirname, '../coverage-dashboard/data.json');

console.log('🔄 Recovering historical trends from git history...\n');
console.log(`Git root: ${gitRoot}\n`);

// Get all commits that touched trends.json
const commitsOutput = execSync(
  'git log --format="%H" --since="2025-10-01" -- "apps/frontend/coverage-dashboard/trends.json"',
  { encoding: 'utf8', cwd: gitRoot }
);
const commits = commitsOutput.trim().split('\n').filter(Boolean);

console.log(`Found ${commits.length} commits to scan...\n`);

// Collect all unique trend entries
const allTrends = new Map();

for (const commit of commits) {
  try {
    const trendsJson = execSync(`git show ${commit}:apps/frontend/coverage-dashboard/trends.json`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: gitRoot,
    });
    const trends = JSON.parse(trendsJson);

    for (const trend of trends) {
      const key = trend.timestamp;
      if (!allTrends.has(key)) {
        allTrends.set(key, trend);
      }
    }
  } catch (_e) {
    // Skip commits where file doesn't exist or is invalid
  }
}

console.log(`Collected ${allTrends.size} unique trend entries\n`);

// Convert to array and sort by timestamp
const sortedTrends = Array.from(allTrends.values()).sort((a, b) => {
  const dateA = new Date(a.timestamp);
  const dateB = new Date(b.timestamp);
  return dateA - dateB;
});

// Show date range
const firstDate = new Date(sortedTrends[0].timestamp);
const lastDate = new Date(sortedTrends[sortedTrends.length - 1].timestamp);

console.log(`📅 Date range: ${firstDate.toLocaleDateString()} to ${lastDate.toLocaleDateString()}`);
console.log(`📊 Total entries: ${sortedTrends.length}\n`);

// Save to trends.json
fs.writeFileSync(TRENDS_FILE, JSON.stringify(sortedTrends, null, 2));
console.log(`✅ Saved ${sortedTrends.length} entries to trends.json`);

// Now update data.json with the recovered trends
if (fs.existsSync(DATA_FILE)) {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  data.trends = sortedTrends;
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  console.log(`✅ Updated data.json with recovered trends\n`);
}

// Show some statistics
const coverageStart = sortedTrends[0].coverage.lines;
const coverageEnd = sortedTrends[sortedTrends.length - 1].coverage.lines;
const coverageGain = coverageEnd - coverageStart;

console.log('📈 Coverage journey:');
console.log(`   Start: ${coverageStart.toFixed(2)}% (${firstDate.toLocaleDateString()})`);
console.log(`   End:   ${coverageEnd.toFixed(2)}% (${lastDate.toLocaleDateString()})`);
console.log(`   Gain:  ${coverageGain >= 0 ? '+' : ''}${coverageGain.toFixed(2)}%\n`);

console.log('🎉 Historical data recovery complete!');
