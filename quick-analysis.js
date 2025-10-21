const fs = require('fs');
const path = require('path');

// Installation Instructions patterns to check
const patterns = [
    /npm install/gi,
    /pip install/gi,
    /docker run/gi,
    /yarn install/gi,
    /composer install/gi,
    /apt-get install/gi,
    /brew install/gi,
    /conda install/gi,
    /setup\.py/gi,
    /requirements\.txt/gi,
    /package\.json/gi,
    /Dockerfile/gi,
    /\.env/gi,
    /virtual\s*environment/gi,
    /venv/gi,
    /virtualenv/gi
];

const docsDir = 'c:\\Users\\USER\\Desktop\\lokifi\\docs';

function scanDirectory(dir) {
    const results = {};

    function scanFile(filePath) {
        if (!filePath.endsWith('.md')) return null;

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const matches = [];

            patterns.forEach((pattern, index) => {
                const found = content.match(pattern);
                if (found) {
                    matches.push({
                        pattern: pattern.toString(),
                        count: found.length,
                        matches: found
                    });
                }
            });

            return matches.length > 0 ? { file: filePath, matches, totalMatches: matches.reduce((sum, m) => sum + m.count, 0) } : null;
        } catch (err) {
            return null;
        }
    }

    function walkDir(currentDir) {
        const items = fs.readdirSync(currentDir);

        items.forEach(item => {
            const fullPath = path.join(currentDir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                walkDir(fullPath);
            } else if (stat.isFile()) {
                const result = scanFile(fullPath);
                if (result) {
                    results[fullPath] = result;
                }
            }
        });
    }

    walkDir(dir);
    return results;
}

const results = scanDirectory(docsDir);
const files = Object.keys(results);

console.log('\n📊 INSTALLATION INSTRUCTIONS ANALYSIS');
console.log('=====================================');
console.log(`Total files with installation patterns: ${files.length}`);

// Sort by total matches (descending)
const sortedFiles = files.sort((a, b) => results[b].totalMatches - results[a].totalMatches);

console.log('\n📋 FILES BY MATCH COUNT:');
console.log('-------------------------');

sortedFiles.forEach((file, index) => {
    const result = results[file];
    const fileName = path.basename(file);
    console.log(`${index + 1}. ${fileName} (${result.totalMatches} matches)`);

    result.matches.forEach(match => {
        console.log(`   - ${match.pattern}: ${match.count} matches`);
    });
    console.log('');
});

console.log(`\n🎯 TARGET FILES FOR CONSOLIDATION: ${files.length}`);
console.log('=====================================');

// Show current status
const startingFiles = 13; // From our previous analysis
const remainingFiles = files.length;
const eliminatedFiles = startingFiles - remainingFiles;
const eliminationRate = ((eliminatedFiles / startingFiles) * 100).toFixed(1);

console.log(`Starting files: ${startingFiles}`);
console.log(`Current files: ${remainingFiles}`);
console.log(`Eliminated: ${eliminatedFiles}`);
console.log(`Elimination rate: ${eliminationRate}%`);
