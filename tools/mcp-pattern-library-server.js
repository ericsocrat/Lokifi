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

// Path to copilot instructions (contains all patterns)
const INSTRUCTIONS_PATH = path.join(
  __dirname,
  '../.github/copilot-instructions.md'
);

/**
 * Read copilot instructions file
 */
function readInstructions() {
  try {
    if (!fs.existsSync(INSTRUCTIONS_PATH)) {
      return {
        error: 'Copilot instructions not found',
        path: INSTRUCTIONS_PATH,
      };
    }

    return fs.readFileSync(INSTRUCTIONS_PATH, 'utf-8');
  } catch (error) {
    return {
      error: `Failed to read instructions: ${error.message}`,
      path: INSTRUCTIONS_PATH,
    };
  }
}

/**
 * Extract pattern library section from instructions
 */
function getPatternLibrarySection() {
  const content = readInstructions();
  if (content.error) return content;

  const patternLibraryMatch = content.match(
    /## 📚 Pattern Library[\s\S]*?(?=\n## |$)/
  );

  if (!patternLibraryMatch) {
    return { error: 'Pattern Library section not found in instructions' };
  }

  return patternLibraryMatch[0];
}

/**
 * Parse all patterns from the Pattern Library section
 */
function parseAllPatterns() {
  const section = getPatternLibrarySection();
  if (section.error) return section;

  // Extract pattern categories
  const categories = [];
  const categoryRegex = /\*\*(.+?) Patterns\*\* \((\d+)\):/g;
  let match;

  while ((match = categoryRegex.exec(section)) !== null) {
    categories.push({
      name: match[1],
      count: parseInt(match[2]),
    });
  }

  // Extract individual patterns (look for bullet points with pattern names)
  const patterns = [];
  const patternRegex =
    /- \*\*(.+?)\*\* - (.+?)(?=\n  - |\n- \*\*|\n\n\*\*|$)/gs;

  while ((match = patternRegex.exec(section)) !== null) {
    const name = match[1].trim();
    const description = match[2].trim();

    // Extract success metrics from description
    const successMatch = description.match(/(\d+%)/);
    const sessionMatch = description.match(/Session[s]? (\d+[-,\s\d]*)/);
    const starsMatch = description.match(/(⭐+)/);

    patterns.push({
      name,
      description,
      success: successMatch ? successMatch[1] : null,
      sessions: sessionMatch ? sessionMatch[1] : null,
      priority: starsMatch ? starsMatch[1].length : 0,
    });
  }

  return {
    categories,
    patterns,
    totalPatterns: patterns.length,
    totalCategories: categories.length,
  };
}

/**
 * Search patterns by keyword or category
 */
function searchPatterns(query = '', category = null) {
  const data = parseAllPatterns();
  if (data.error) return data;

  const queryLower = query.toLowerCase();
  let results = data.patterns;

  // Filter by category if specified
  if (category) {
    const categoryLower = category.toLowerCase();
    const section = getPatternLibrarySection();

    // Find patterns in the specified category section
    const categorySection = section.match(
      new RegExp(
        `\\*\\*${category}[^*]*?Patterns\\*\\*[\\s\\S]*?(?=\\n\\*\\*[A-Z]|$)`,
        'i'
      )
    );

    if (categorySection) {
      const categoryPatternNames = [];
      const patternRegex = /- \*\*(.+?)\*\*/g;
      let match;

      while ((match = patternRegex.exec(categorySection[0])) !== null) {
        categoryPatternNames.push(match[1].trim());
      }

      results = results.filter((p) => categoryPatternNames.includes(p.name));
    }
  }

  // Filter by search query
  if (query) {
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(queryLower) ||
        p.description.toLowerCase().includes(queryLower)
    );
  }

  return {
    query,
    category,
    count: results.length,
    patterns: results,
  };
}

/**
 * Get detailed information about a specific pattern
 */
function getPatternDetails(patternName) {
  const section = getPatternLibrarySection();
  if (section.error) return section;

  const patternNameLower = patternName.toLowerCase();

  // Find the pattern section (includes sub-bullets with details)
  const patternRegex = new RegExp(
    `- \\*\\*${patternName}[^*]*?\\*\\* - [\\s\\S]*?(?=\\n- \\*\\*|\\n\\n\\*\\*|$)`,
    'i'
  );

  const match = section.match(patternRegex);

  if (!match) {
    // Try fuzzy search
    const allPatterns = parseAllPatterns();
    if (allPatterns.error) return allPatterns;

    const fuzzyMatch = allPatterns.patterns.find((p) =>
      p.name.toLowerCase().includes(patternNameLower)
    );

    if (fuzzyMatch) {
      return {
        message: `Pattern "${patternName}" not found. Did you mean "${fuzzyMatch.name}"?`,
        suggestion: fuzzyMatch.name,
      };
    }

    return {
      error: `Pattern "${patternName}" not found`,
      suggestion: 'Use search_patterns to find available patterns',
    };
  }

  // Extract pattern details
  const patternText = match[0];
  const lines = patternText.split('\n');

  // Parse main description and sub-points
  const mainLine = lines[0];
  const name = mainLine.match(/- \*\*(.+?)\*\*/)[1];
  const description = mainLine.match(/\*\* - (.+)/)[1];

  // Extract sub-points (indented bullets)
  const details = lines
    .slice(1)
    .filter((line) => line.trim().startsWith('-'))
    .map((line) => line.trim().substring(2));

  // Extract code examples if any
  const codeBlocks = [];
  const codeRegex = /```[\s\S]*?```/g;
  let codeMatch;

  while ((codeMatch = codeRegex.exec(patternText)) !== null) {
    codeBlocks.push(codeMatch[0]);
  }

  // Extract references to documentation
  const docMatch = patternText.match(/\*\*Complete Guide\*\*: `(.+?)`/);
  const guideMatch = patternText.match(/\*\*Complete Documentation\*\*: `(.+?)`/);

  return {
    name,
    description,
    details,
    codeExamples: codeBlocks,
    documentation: docMatch ? docMatch[1] : guideMatch ? guideMatch[1] : null,
    fullText: patternText,
  };
}

/**
 * List all pattern categories
 */
function listCategories() {
  const section = getPatternLibrarySection();
  if (section.error) return section;

  const categories = [];
  const categoryRegex = /\*\*(.+?) Patterns\*\* \((\d+)\):/g;
  let match;

  while ((match = categoryRegex.exec(section)) !== null) {
    categories.push({
      name: match[1],
      count: parseInt(match[2]),
    });
  }

  // Extract total pattern count from header
  const headerMatch = section.match(/\*\*(\d+) Battle-Tested Patterns\*\*/);
  const totalPatterns = headerMatch ? parseInt(headerMatch[1]) : 0;

  const sessionsMatch = section.match(/from (\d+)\+ sessions/);
  const totalSessions = sessionsMatch ? sessionsMatch[1] : '91+';

  return {
    categories,
    totalCategories: categories.length,
    totalPatterns,
    totalSessions,
    summary: `${totalPatterns} patterns across ${categories.length} categories from ${totalSessions} sessions`,
  };
}

/**
 * Get success metrics and statistics
 */
function getSuccessMetrics() {
  const data = parseAllPatterns();
  if (data.error) return data;

  // Calculate statistics
  const patternsWithSuccess = data.patterns.filter((p) => p.success);
  const highPriority = data.patterns.filter((p) => p.priority >= 3);
  const mediumPriority = data.patterns.filter((p) => p.priority === 2);
  const lowPriority = data.patterns.filter((p) => p.priority === 1);

  // Extract overall success rate from pattern library intro
  const section = getPatternLibrarySection();
  const metricsMatch = section.match(
    /\*\*Success Metrics\*\*: (.+?)(?=\n|$)/
  );

  return {
    totalPatterns: data.totalPatterns,
    totalCategories: data.totalCategories,
    patternsWithMetrics: patternsWithSuccess.length,
    priorityBreakdown: {
      high: highPriority.length,
      medium: mediumPriority.length,
      low: lowPriority.length,
      none: data.totalPatterns - highPriority.length - mediumPriority.length - lowPriority.length,
    },
    topPatterns: highPriority.slice(0, 10).map((p) => ({
      name: p.name,
      priority: '⭐'.repeat(p.priority),
      success: p.success,
    })),
    overallMetrics: metricsMatch ? metricsMatch[1] : null,
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

      default:
        result = { error: `Unknown tool: ${name}` };
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
  console.error(`Instructions path: ${INSTRUCTIONS_PATH}`);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
