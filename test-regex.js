const content = `## Test

\`\`\`bash
# Comment that looks like heading
code here
\`\`\`

### Real heading

\`\`\`
# Another comment
\`\`\`

## Test2`;

console.log('Original content:');
console.log(content);
console.log('\n---\n');

const filtered = content.replace(/```[\s\S]*?```/g, '');
console.log('Filtered content:');
console.log(filtered);
console.log('\n---\n');

const headings = filtered.match(/^#{1,6}\s+.+$/gm) || [];
console.log('Found headings:');
headings.forEach(h => console.log('  ' + h));
