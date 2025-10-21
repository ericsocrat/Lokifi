const fs = require('fs');

const content = fs.readFileSync('docs/guides/DEVELOPER_WORKFLOW.md', 'utf-8');
const filtered = content.replace(/```[\s\S]*?```/g, '');
const lines = filtered.split('\n');

console.log('All headings with line numbers:\n');
lines.forEach((line, idx) => {
  if (line.match(/^#{1,6}\s+/)) {
    const level = line.match(/^#+/)[0].length;
    console.log(`Line ${idx + 1} (h${level}): ${line}`);
  }
});

console.log('\n---\nChecking hierarchy:\n');
const headings = filtered.match(/^#{1,6}\s+.+$/gm) || [];
let previousLevel = 0;

headings.forEach((heading, idx) => {
  const level = heading.match(/^#+/)[0].length;
  const status = (level > previousLevel + 1 && previousLevel > 0) ? '❌ ERROR' : '✅';
  console.log(`${status} h${previousLevel} → h${level}: ${heading.trim()}`);
  previousLevel = level;
});
