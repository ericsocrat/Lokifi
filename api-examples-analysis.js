const fs = require('fs');
const path = require('path');

// API Examples patterns to check
const patterns = [
    { name: 'API Endpoints', regex: /\/api\/[a-zA-Z0-9_\-\/]+/gi },
    { name: 'HTTP Methods', regex: /(GET|POST|PUT|DELETE|PATCH)\s+[\/\w\-\.]+/gi },
    { name: 'API Keys', regex: /api[_\-\s]*key/gi },
    { name: 'API Response', regex: /api[_\-\s]*response/gi },
    { name: 'API Documentation', regex: /api[_\-\s]*doc/gi },
    { name: 'REST API', regex: /rest[_\-\s]*api/gi },
    { name: 'API Reference', regex: /api[_\-\s]*reference/gi },
    { name: 'API Guide', regex: /api[_\-\s]*guide/gi },
    { name: 'PostgreSQL (False Positive)', regex: /postgresql/gi },
    { name: 'FastAPI Framework', regex: /fastapi/gi },
    { name: 'API Configuration', regex: /api[_\-\s]*config/gi },
    { name: 'API Testing', regex: /api[_\-\s]*test/gi },
    { name: 'JWT Token', regex: /jwt[_\-\s]*token/gi },
    { name: 'Authentication API', regex: /auth.*api/gi },
    { name: 'API Validation', regex: /api[_\-\s]*validation/gi }
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
                const found = content.match(pattern.regex);
                if (found) {
                    matches.push({
                        pattern: pattern.name,
                        regex: pattern.regex.toString(),
                        count: found.length,
                        matches: found.slice(0, 5) // Show first 5 matches
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

console.log('\n📊 API EXAMPLES ANALYSIS');
console.log('========================');
console.log(`Total files with API patterns: ${files.length}`);

// Sort by total matches (descending)
const sortedFiles = files.sort((a, b) => results[b].totalMatches - results[a].totalMatches);

console.log('\n📋 FILES BY MATCH COUNT:');
console.log('-------------------------');

let totalMatches = 0;
let postgresqlFiles = 0;
let fastapiFiles = 0;
let legitimateApiFiles = 0;

sortedFiles.forEach((file, index) => {
    const result = results[file];
    const fileName = path.basename(file);
    console.log(`${index + 1}. ${fileName} (${result.totalMatches} matches)`);
    
    let hasPostgreSQL = false;
    let hasFastAPI = false;
    let hasLegitimateAPI = false;
    
    result.matches.forEach(match => {
        console.log(`   - ${match.pattern}: ${match.count} matches`);
        if (match.matches.length > 0) {
            console.log(`     Examples: ${match.matches.slice(0, 3).join(', ')}`);
        }
        
        if (match.pattern === 'PostgreSQL (False Positive)') hasPostgreSQL = true;
        if (match.pattern === 'FastAPI Framework') hasFastAPI = true;
        if (match.pattern.includes('API Endpoints') || match.pattern.includes('HTTP Methods')) hasLegitimateAPI = true;
    });
    
    if (hasPostgreSQL) postgresqlFiles++;
    if (hasFastAPI) fastapiFiles++;
    if (hasLegitimateAPI) legitimateApiFiles++;
    
    totalMatches += result.totalMatches;
    console.log('');
});

console.log('\n🎯 FALSE POSITIVE ANALYSIS:');
console.log('============================');
console.log(`Files with PostgreSQL (likely false positive): ${postgresqlFiles}`);
console.log(`Files with FastAPI (framework reference): ${fastapiFiles}`);
console.log(`Files with legitimate API examples: ${legitimateApiFiles}`);
console.log(`Total pattern matches across all files: ${totalMatches}`);

console.log('\n🔍 CONSOLIDATION OPPORTUNITIES:');
console.log('================================');
console.log('High-priority targets for consolidation:');

// Identify files with mostly false positives
const falsePositiveCandidates = sortedFiles.filter(file => {
    const result = results[file];
    const hasPostgreSQL = result.matches.some(m => m.pattern === 'PostgreSQL (False Positive)');
    const hasOnlyFrameworkRefs = result.matches.every(m => 
        m.pattern === 'PostgreSQL (False Positive)' || 
        m.pattern === 'FastAPI Framework' ||
        m.pattern === 'API Configuration' ||
        m.pattern === 'API Testing'
    );
    return hasPostgreSQL || hasOnlyFrameworkRefs;
});

console.log(`\n📌 FALSE POSITIVE CANDIDATES (${falsePositiveCandidates.length} files):`);
falsePositiveCandidates.forEach((file, index) => {
    const fileName = path.basename(file);
    const matchCount = results[file].totalMatches;
    console.log(`${index + 1}. ${fileName} (${matchCount} matches) - Likely consolidatable`);
});

console.log(`\n🎯 POTENTIAL ELIMINATION RATE: ${((falsePositiveCandidates.length / files.length) * 100).toFixed(1)}%`);