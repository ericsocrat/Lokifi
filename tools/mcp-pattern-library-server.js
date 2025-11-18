#!/usr/bin/env node

/**
 * Lokifi MCP Pattern Library Server
 *
 * Model Context Protocol server that provides access to 48+ battle-tested patterns
 * from 91+ development sessions. Enables AI assistants to query proven solutions
 * without reinventing the wheel.
 *
 * Usage:
 *   node tools/mcp-pattern-library-server.js
 *
 * VS Code Configuration:
 *   Add to .vscode/settings.json:
 *   {
 *     "github.copilot.chat.mcpServers": {
 *       "lokifi-patterns": {
 *         "command": "node",
 *         "args": ["${workspaceFolder}/tools/mcp-pattern-library-server.js"]
 *       }
 *     }
 *   }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to pattern library directory (single source of truth)
const PATTERNS_DIR = path.join(
  __dirname,
  '../docs/architecture/patterns'
);

// In-memory cache for parsed patterns
let patternCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Enhanced error helper
 */
function createError(message, context = {}) {
  return {
    error: message,
    ...context,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Invalidate pattern cache
 */
function invalidateCache() {
  patternCache = null;
  cacheTimestamp = null;
}

/**
 * Get cached patterns or load fresh
 */
function getCachedPatterns() {
  const now = Date.now();
  if (patternCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    return patternCache;
  }

  const patterns = getAllPatterns();
  if (!patterns.error) {
    patternCache = patterns;
    cacheTimestamp = now;
  }
  return patterns;
}

/**
 * Find all pattern markdown files in the patterns directory
 */
function findPatternFiles() {
  try {
    if (!fs.existsSync(PATTERNS_DIR)) {
      return createError('Pattern directory not found', {
        path: PATTERNS_DIR,
        suggestion: 'Ensure /docs/architecture/patterns/ exists',
      });
    }

    const files = [];

    // Scan all subdirectories (testing/, ci-cd/, code-quality/, etc.)
    const categories = fs.readdirSync(PATTERNS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const category of categories) {
      const categoryPath = path.join(PATTERNS_DIR, category);
      const categoryFiles = fs.readdirSync(categoryPath)
        .filter(file => file.endsWith('.md'))
        .map(file => ({
          path: path.join(categoryPath, file),
          category,
          filename: file,
        }));

      files.push(...categoryFiles);
    }

    return files;
  } catch (error) {
    return createError('Failed to find pattern files', {
      path: PATTERNS_DIR,
      details: error.message,
      suggestion: 'Check directory permissions and structure',
    });
  }
}

/**
 * Parse pattern metadata from markdown file content
 */
function parsePatternMetadata(content, category, filename) {
  const lines = content.split('\n');

  // Extract title (first H1 heading)
  const titleMatch = content.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1] : filename.replace('.md', '');

  // Extract metadata from the front matter section
  const metadata = {
    title,
    category,
    filename,
    difficulty: null,
    successRate: null,
    impact: null,
    timeInvestment: null,
    sessionsUsed: null,
  };

  // Parse metadata lines (look for **Key**: Value pattern)
  for (const line of lines.slice(0, 20)) { // Check first 20 lines for metadata
    if (line.includes('**Difficulty**:')) {
      metadata.difficulty = line.split(':')[1].trim();
    }
    if (line.includes('**Success Rate**:')) {
      const match = line.match(/(\d+%)/);
      metadata.successRate = match ? match[1] : line.split(':')[1].trim();
    }
    if (line.includes('**Impact**:')) {
      metadata.impact = line.split(':')[1].trim();
    }
    if (line.includes('**Time Investment**:')) {
      metadata.timeInvestment = line.split(':')[1].trim();
    }
    if (line.includes('**Sessions Used**:')) {
      metadata.sessionsUsed = line.split(':')[1].trim();
    }
  }

  // Extract short description (first paragraph after ## Problem or similar)
  const problemMatch = content.match(/## Problem\s+([\s\S]+?)(?=\n##|$)/);
  const contextMatch = content.match(/## Context\s+([\s\S]+?)(?=\n##|$)/);
  const description = problemMatch
    ? problemMatch[1].trim().split('\n')[0]
    : contextMatch
      ? contextMatch[1].trim().split('\n')[0]
      : 'Pattern description not available';

  metadata.description = description.substring(0, 200); // Limit to 200 chars

  return metadata;
}

/**
 * Get all patterns with metadata
 */
function getAllPatterns() {
  const files = findPatternFiles();
  if (files.error) return files;

  const patterns = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file.path, 'utf-8');
      const metadata = parsePatternMetadata(content, file.category, file.filename);

      patterns.push({
        ...metadata,
        path: file.path,
      });
    } catch (error) {
      console.error(`Failed to parse ${file.path}:`, error.message);
    }
  }

  return patterns;
}

/**
 * Search patterns by keyword or category
 */
function searchPatterns(query = '', category = null) {
  const patterns = getCachedPatterns();
  if (patterns.error) return patterns;

  const queryLower = query.toLowerCase();
  let results = patterns;

  // Filter by category if specified
  if (category) {
    const categoryLower = category.toLowerCase();
    results = results.filter((p) => p.category.toLowerCase() === categoryLower);
  }

  // Filter by search query
  if (query) {
    results = results.filter(
      (p) =>
        p.title.toLowerCase().includes(queryLower) ||
        p.description.toLowerCase().includes(queryLower) ||
        p.category.toLowerCase().includes(queryLower)
    );
  }

  return {
    query,
    category,
    count: results.length,
    patterns: results.map(p => ({
      title: p.title,
      category: p.category,
      difficulty: p.difficulty,
      successRate: p.successRate,
      impact: p.impact,
      description: p.description,
      filename: p.filename,
    })),
  };
}

/**
 * Get detailed information about a specific pattern
 */
function getPatternDetails(patternName) {
  const patterns = getCachedPatterns();
  if (patterns.error) return patterns;

  const patternNameLower = patternName.toLowerCase();

  // Find exact match (by title or filename)
  let pattern = patterns.find(
    (p) =>
      p.title.toLowerCase() === patternNameLower ||
      p.filename.toLowerCase() === patternNameLower.replace(/\s+/g, '-') + '.md'
  );

  // Try fuzzy match if exact match not found
  if (!pattern) {
    pattern = patterns.find((p) =>
      p.title.toLowerCase().includes(patternNameLower)
    );
  }

  if (!pattern) {
    // Suggest similar patterns
    const suggestions = patterns
      .filter((p) => {
        const words = patternNameLower.split(/\s+/);
        return words.some(word => p.title.toLowerCase().includes(word));
      })
      .slice(0, 3)
      .map(p => p.title);

    return createError(`Pattern "${patternName}" not found`, {
      suggestions: suggestions.length > 0 ? suggestions : null,
      hint: 'Use search_patterns to find available patterns',
      availableCategories: [...new Set(patterns.map(p => p.category))],
    });
  }

  // Read full pattern content
  try {
    const content = fs.readFileSync(pattern.path, 'utf-8');

    return {
      title: pattern.title,
      category: pattern.category,
      metadata: {
        difficulty: pattern.difficulty,
        successRate: pattern.successRate,
        impact: pattern.impact,
        timeInvestment: pattern.timeInvestment,
        sessionsUsed: pattern.sessionsUsed,
      },
      fullContent: content,
      path: pattern.path.replace(/\\/g, '/'), // Normalize path for display
    };
  } catch (error) {
    return createError('Failed to read pattern file', {
      pattern: pattern.title,
      details: error.message,
      suggestion: 'Check file permissions',
    });
  }
}

/**
 * List all pattern categories
 */
function listCategories() {
  const files = findPatternFiles();
  if (files.error) return files;

  // Group patterns by category
  const categoryMap = new Map();

  for (const file of files) {
    if (!categoryMap.has(file.category)) {
      categoryMap.set(file.category, []);
    }
    categoryMap.get(file.category).push(file.filename);
  }

  // Convert to array with counts
  const categories = Array.from(categoryMap.entries()).map(([name, files]) => ({
    name,
    count: files.length,
    patterns: files.map(f => f.replace('.md', '')),
  }));

  // Sort by count (descending)
  categories.sort((a, b) => b.count - a.count);

  const totalPatterns = files.length;
  const totalCategories = categories.length;

  return {
    categories,
    totalCategories,
    totalPatterns,
    summary: `${totalPatterns} patterns across ${totalCategories} categories`,
  };
}

/**
 * Compare multiple patterns side-by-side
 */
function comparePatterns(patternNames) {
  if (!patternNames || !Array.isArray(patternNames) || patternNames.length < 2) {
    return createError('At least 2 pattern names required for comparison', {
      received: patternNames,
      suggestion: 'Provide array with 2+ pattern names',
      example: '["AsyncMock Pattern", "Fixtures Pattern"]',
    });
  }

  const patterns = getCachedPatterns();
  if (patterns.error) return patterns;

  const foundPatterns = [];
  const notFound = [];

  patternNames.forEach((name) => {
    const nameLower = name.toLowerCase();
    const pattern = patterns.find(
      (p) =>
        p.title.toLowerCase() === nameLower ||
        p.filename.toLowerCase() === nameLower.replace(/\s+/g, '-') + '.md'
    );

    if (pattern) {
      // Load full content for comparison
      try {
        const content = fs.readFileSync(pattern.path, 'utf-8');
        foundPatterns.push({ ...pattern, fullContent: content });
      } catch (error) {
        foundPatterns.push({ ...pattern, fullContent: null });
      }
    } else {
      notFound.push(name);
    }
  });

  if (notFound.length > 0) {
    return createError('Some patterns not found', {
      notFound,
      found: foundPatterns.map((p) => p.title),
      suggestion: 'Use search_patterns to find correct pattern names',
    });
  }

  // Extract comparison sections
  const comparison = {
    patterns: foundPatterns.map((p) => ({
      title: p.title,
      category: p.category,
      difficulty: p.difficulty,
      successRate: p.successRate,
      impact: p.impact,
      timeInvestment: p.timeInvestment,
    })),
    useCases: {},
    whenToUse: {},
    strengths: {},
    weaknesses: {},
  };

  // Parse comparison data from full content
  foundPatterns.forEach((pattern) => {
    if (pattern.fullContent) {
      // Extract "When to Use" section
      const whenMatch = pattern.fullContent.match(
        /## When to Use[\s\S]+?(?=\n##|$)/
      );
      if (whenMatch) {
        comparison.whenToUse[pattern.title] = whenMatch[0]
          .replace('## When to Use', '')
          .trim()
          .substring(0, 500);
      }

      // Extract problem/context for use cases
      const problemMatch = pattern.fullContent.match(
        /## Problem[\s\S]+?(?=\n##|$)/
      );
      if (problemMatch) {
        comparison.useCases[pattern.title] = problemMatch[0]
          .replace('## Problem', '')
          .trim()
          .substring(0, 300);
      }
    }
  });

  return {
    comparisonCount: foundPatterns.length,
    comparison,
    recommendation:
      'Consider combining patterns for comprehensive solution',
  };
}

/**
 * Get pattern recommendations based on problem description
 */
function getPatternRecommendations(problemDescription, maxResults = 5) {
  if (!problemDescription || problemDescription.trim() === '') {
    return createError('Problem description is required', {
      suggestion: 'Describe your use case (e.g., "testing async API calls")',
      examples: [
        'testing external API calls',
        'state management with complex updates',
        'fixing TypeScript type errors',
      ],
    });
  }

  const patterns = getCachedPatterns();
  if (patterns.error) return patterns;

  const keywords = problemDescription.toLowerCase().split(/\s+/);
  const scored = [];

  patterns.forEach((pattern) => {
    let score = 0;
    const searchableText = `
      ${pattern.title}
      ${pattern.description}
      ${pattern.category}
    `.toLowerCase();

    // Score based on keyword matches
    keywords.forEach((keyword) => {
      if (keyword.length < 3) return; // Skip short words

      if (pattern.title.toLowerCase().includes(keyword)) score += 10;
      if (pattern.description.toLowerCase().includes(keyword)) score += 5;
      if (pattern.category.toLowerCase().includes(keyword)) score += 3;
    });

    // Boost high-impact patterns
    if (pattern.impact?.includes('High')) score += 2;
    if (pattern.successRate) {
      const rate = parseInt(pattern.successRate.match(/(\d+)%/)?.[1] || '0');
      score += Math.floor(rate / 20); // 0-5 points based on success rate
    }

    if (score > 0) {
      scored.push({ pattern, score });
    }
  });

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  const recommendations = scored.slice(0, maxResults).map((s) => ({
    title: s.pattern.title,
    category: s.pattern.category,
    relevanceScore: s.score,
    difficulty: s.pattern.difficulty,
    successRate: s.pattern.successRate,
    impact: s.pattern.impact,
    description: s.pattern.description,
    filename: s.pattern.filename,
  }));

  return {
    query: problemDescription,
    totalMatches: scored.length,
    recommendations,
    suggestion:
      scored.length === 0
        ? 'Try broader keywords or search by category'
        : 'Review top recommendations and use get_pattern_details for full info',
  };
}

/**
 * Get success metrics and statistics
 */
function getSuccessMetrics() {
  const patterns = getAllPatterns();
  if (patterns.error) return patterns;

  // Calculate statistics
  const patternsWithSuccess = patterns.filter((p) => p.successRate);

  // Parse success rates and calculate average
  const successRates = patternsWithSuccess
    .map(p => {
      const match = p.successRate?.match(/(\d+)%/);
      return match ? parseInt(match[1]) : null;
    })
    .filter(rate => rate !== null);

  const averageSuccess = successRates.length > 0
    ? Math.round(successRates.reduce((a, b) => a + b, 0) / successRates.length)
    : null;

  // Group by category
  const categoryStats = {};
  for (const pattern of patterns) {
    if (!categoryStats[pattern.category]) {
      categoryStats[pattern.category] = 0;
    }
    categoryStats[pattern.category]++;
  }

  // Find high-impact patterns
  const highImpact = patterns.filter(p =>
    p.impact?.includes('High') || p.impact?.includes('🎯')
  );

  return {
    totalPatterns: patterns.length,
    patternsWithMetrics: patternsWithSuccess.length,
    averageSuccessRate: averageSuccess ? `${averageSuccess}%` : 'N/A',
    categoryBreakdown: categoryStats,
    highImpactPatterns: highImpact.map(p => ({
      title: p.title,
      category: p.category,
      successRate: p.successRate,
      impact: p.impact,
    })),
    topPatterns: patterns
      .filter(p => p.successRate)
      .sort((a, b) => {
        const aRate = parseInt(a.successRate?.match(/(\d+)%/)?.[1] || '0');
        const bRate = parseInt(b.successRate?.match(/(\d+)%/)?.[1] || '0');
        return bRate - aRate;
      })
      .slice(0, 10)
      .map(p => ({
        title: p.title,
        category: p.category,
        successRate: p.successRate,
        impact: p.impact,
      })),
  };
}

// Create MCP server
const server = new Server(
  {
    name: 'lokifi-patterns',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_patterns',
        description:
          'Search for patterns by keyword or category. Returns matching patterns with success metrics.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'Search keyword (e.g., "AsyncMock", "TypeScript", "testing")',
              default: '',
            },
            category: {
              type: 'string',
              description:
                'Filter by category (e.g., "Testing", "Code Quality", "CI/CD")',
            },
          },
        },
      },
      {
        name: 'get_pattern_details',
        description:
          'Get detailed information about a specific pattern including code examples, documentation links, and implementation details.',
        inputSchema: {
          type: 'object',
          properties: {
            patternName: {
              type: 'string',
              description:
                'Name of the pattern (e.g., "AsyncMock Pattern", "Zustand + Immer Pattern")',
            },
          },
          required: ['patternName'],
        },
      },
      {
        name: 'list_categories',
        description:
          'List all pattern categories with pattern counts and overview statistics.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_success_metrics',
        description:
          'Get overall success metrics, priority breakdown, and top-performing patterns.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'compare_patterns',
        description:
          'Compare multiple patterns side-by-side to understand differences, use cases, and when to use each.',
        inputSchema: {
          type: 'object',
          properties: {
            patternNames: {
              type: 'array',
              description:
                'Array of pattern names to compare (minimum 2)',
              items: {
                type: 'string',
              },
            },
          },
          required: ['patternNames'],
        },
      },
      {
        name: 'get_pattern_recommendations',
        description:
          'Get pattern recommendations based on a problem description. AI-powered suggestions ranked by relevance.',
        inputSchema: {
          type: 'object',
          properties: {
            problemDescription: {
              type: 'string',
              description:
                'Describe your use case or problem (e.g., "testing async API calls")',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of recommendations (default 5)',
              default: 5,
            },
          },
          required: ['problemDescription'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'search_patterns':
        result = searchPatterns(args?.query || '', args?.category || null);
        break;

      case 'get_pattern_details':
        if (!args?.patternName) {
          result = { error: 'patternName argument is required' };
        } else {
          result = getPatternDetails(args.patternName);
        }
        break;

      case 'list_categories':
        result = listCategories();
        break;

      case 'get_success_metrics':
        result = getSuccessMetrics();
        break;

      case 'compare_patterns':
        if (!args?.patternNames) {
          result = createError('patternNames argument is required', {
            suggestion: 'Provide array with 2+ pattern names',
          });
        } else {
          result = comparePatterns(args.patternNames);
        }
        break;

      case 'get_pattern_recommendations':
        if (!args?.problemDescription) {
          result = createError('problemDescription argument is required', {
            suggestion: 'Describe your use case or problem',
          });
        } else {
          result = getPatternRecommendations(
            args.problemDescription,
            args?.maxResults || 5
          );
        }
        break;

      default:
        result = createError(`Unknown tool: ${name}`, {
          availableTools: [
            'search_patterns',
            'get_pattern_details',
            'list_categories',
            'get_success_metrics',
            'compare_patterns',
            'get_pattern_recommendations',
          ],
        });
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: `Tool execution failed: ${error.message}`,
              tool: name,
              stack: error.stack,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is for MCP protocol)
  console.error('Lokifi Pattern Library MCP Server running');
  console.error(`Pattern directory: ${PATTERNS_DIR}`);

  // Log pattern count
  const files = findPatternFiles();
  if (!files.error) {
    console.error(`Loaded ${files.length} patterns from ${new Set(files.map(f => f.category)).size} categories`);
  }
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
