#!/usr/bin/env node

/**
 * Lokifi MCP Coverage Server
 *
 * Model Context Protocol server that provides real-time access to test coverage data.
 * Allows AI assistants to query coverage metrics without running tests.
 *
 * Usage:
 *   node tools/mcp-coverage-server.js
 *
 * VS Code Configuration:
 *   Add to .vscode/settings.json:
 *   {
 *     "github.copilot.chat.mcpServers": {
 *       "lokifi-coverage": {
 *         "command": "node",
 *         "args": ["${workspaceFolder}/tools/mcp-coverage-server.js"]
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

// Path to coverage data
const COVERAGE_DATA_PATH = path.join(
  __dirname,
  '../apps/frontend/coverage-dashboard/data.json'
);

// Coverage thresholds from config
const THRESHOLDS = {
  frontend: {
    statements: 10,
    branches: 10,
    functions: 10,
    lines: 10,
  },
  backend: {
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80,
  },
  overall: 20,
};

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
 * Read and parse coverage data
 */
function getCoverageData() {
  try {
    if (!fs.existsSync(COVERAGE_DATA_PATH)) {
      return createError('Coverage data not found. Run: npm run test:coverage', {
        path: COVERAGE_DATA_PATH,
        suggestion: 'Generate coverage with: cd apps/frontend && npm run test:coverage',
      });
    }

    const data = JSON.parse(fs.readFileSync(COVERAGE_DATA_PATH, 'utf-8'));
    return data;
  } catch (error) {
    return createError('Failed to read coverage data', {
      path: COVERAGE_DATA_PATH,
      details: error.message,
      suggestion: 'Ensure coverage data is valid JSON',
    });
  }
}

/**
 * Get current coverage summary
 */
function getCoverageSummary() {
  const data = getCoverageData();
  if (data.error) return data;

  const { current, git } = data;

  return {
    summary: {
      statements: current.coverage.statements,
      branches: current.coverage.branches,
      functions: current.coverage.functions,
      lines: current.coverage.lines,
    },
    tests: current.tests,
    thresholds: THRESHOLDS,
    passingThresholds: {
      frontend: current.coverage.statements >= THRESHOLDS.frontend.statements,
      backend: false, // Backend data not in this file
      overall: current.coverage.statements >= THRESHOLDS.overall,
    },
    git: {
      branch: git.branch,
      commit: git.commit,
      author: git.author,
    },
    generated: current.generated || data.generated,
  };
}

/**
 * Get files with coverage below threshold
 */
function getLowCoverageFiles(threshold = 80) {
  const data = getCoverageData();
  if (data.error) return data;

  const { files } = data;
  if (!files || !Array.isArray(files)) {
    return { error: 'No file-level coverage data available' };
  }

  const lowCoverageFiles = files
    .filter((file) => {
      const coverage = file.coverage;
      return (
        coverage.statements < threshold ||
        coverage.branches < threshold ||
        coverage.functions < threshold ||
        coverage.lines < threshold
      );
    })
    .map((file) => ({
      path: file.path,
      coverage: file.coverage,
      uncovered: {
        statements: file.totals.statements.total - file.totals.statements.covered,
        branches: file.totals.branches.total - file.totals.branches.covered,
        functions: file.totals.functions.total - file.totals.functions.covered,
        lines: file.totals.lines.total - file.totals.lines.covered,
      },
    }))
    .sort((a, b) => a.coverage.statements - b.coverage.statements);

  return {
    threshold,
    count: lowCoverageFiles.length,
    files: lowCoverageFiles.slice(0, 20), // Top 20 worst files
  };
}

/**
 * Get coverage trends (compare with historical data)
 */
function getCoverageTrends() {
  const data = getCoverageData();
  if (data.error) return data;

  const { current, history } = data;
  if (!history || history.length === 0) {
    return {
      message: 'No historical data available yet',
      current: current.coverage,
    };
  }

  const latestHistory = history[0];
  const trends = {
    statements: current.coverage.statements - latestHistory.coverage.statements,
    branches: current.coverage.branches - latestHistory.coverage.branches,
    functions: current.coverage.functions - latestHistory.coverage.functions,
    lines: current.coverage.lines - latestHistory.coverage.lines,
  };

  return {
    current: current.coverage,
    previous: latestHistory.coverage,
    change: trends,
    improving:
      trends.statements > 0 &&
      trends.branches > 0 &&
      trends.functions > 0 &&
      trends.lines > 0,
    historyCount: history.length,
  };
}

/**
 * Get detailed file coverage
 */
function getFileCoverage(filePath) {
  const data = getCoverageData();
  if (data.error) return data;

  const { files } = data;
  if (!files || !Array.isArray(files)) {
    return { error: 'No file-level coverage data available' };
  }

  const file = files.find((f) => f.path.includes(filePath));
  if (!file) {
    return createError(`File not found: ${filePath}`, {
      suggestion: 'Try a partial path match',
      availableFiles: files.slice(0, 10).map((f) => f.path),
      examples: ['portfolioStore', 'components/dashboard', 'lib/stores'],
    });
  }

  return {
    path: file.path,
    coverage: file.coverage,
    totals: file.totals,
    uncoveredLines: file.uncoveredLines || [],
  };
}

/**
 * Get coverage grouped by directory/category
 */
function getCoverageByCategory() {
  const data = getCoverageData();
  if (data.error) return data;

  const { files } = data;
  if (!files || !Array.isArray(files)) {
    return createError('No file-level coverage data available', {
      suggestion: 'Run tests with coverage to generate file data',
    });
  }

  // Group files by directory
  const categories = {};

  files.forEach((file) => {
    // Extract category from path (e.g., "components/", "lib/stores/", "hooks/")
    const pathParts = file.path.split('/');
    let category = 'root';

    if (pathParts.length > 1) {
      // For nested paths like "components/dashboard/Chart.tsx"
      if (pathParts[0] === 'src' && pathParts.length > 2) {
        category = pathParts[1]; // "components", "lib", "hooks"
        if (pathParts[1] === 'lib' && pathParts.length > 3) {
          category = `lib/${pathParts[2]}`; // "lib/stores", "lib/utils"
        }
      } else {
        category = pathParts[0];
      }
    }

    if (!categories[category]) {
      categories[category] = {
        files: [],
        totals: {
          statements: { total: 0, covered: 0 },
          branches: { total: 0, covered: 0 },
          functions: { total: 0, covered: 0 },
          lines: { total: 0, covered: 0 },
        },
      };
    }

    categories[category].files.push(file);

    // Aggregate totals
    const cat = categories[category];
    cat.totals.statements.total += file.totals.statements.total;
    cat.totals.statements.covered += file.totals.statements.covered;
    cat.totals.branches.total += file.totals.branches.total;
    cat.totals.branches.covered += file.totals.branches.covered;
    cat.totals.functions.total += file.totals.functions.total;
    cat.totals.functions.covered += file.totals.functions.covered;
    cat.totals.lines.total += file.totals.lines.total;
    cat.totals.lines.covered += file.totals.lines.covered;
  });

  // Calculate coverage percentages for each category
  const categorySummary = Object.keys(categories).map((name) => {
    const cat = categories[name];
    const coverage = {
      statements:
        cat.totals.statements.total > 0
          ? Math.round(
              (cat.totals.statements.covered / cat.totals.statements.total) *
                100
            )
          : 0,
      branches:
        cat.totals.branches.total > 0
          ? Math.round(
              (cat.totals.branches.covered / cat.totals.branches.total) * 100
            )
          : 0,
      functions:
        cat.totals.functions.total > 0
          ? Math.round(
              (cat.totals.functions.covered / cat.totals.functions.total) * 100
            )
          : 0,
      lines:
        cat.totals.lines.total > 0
          ? Math.round((cat.totals.lines.covered / cat.totals.lines.total) * 100)
          : 0,
    };

    return {
      category: name,
      fileCount: cat.files.length,
      coverage,
      totals: cat.totals,
    };
  });

  // Sort by statements coverage (lowest first)
  categorySummary.sort((a, b) => a.coverage.statements - b.coverage.statements);

  return {
    categoryCount: categorySummary.length,
    categories: categorySummary,
    weakestCategory: categorySummary[0],
    strongestCategory: categorySummary[categorySummary.length - 1],
  };
}

/**
 * Suggest test priorities based on coverage + complexity + recency
 */
function suggestTestPriorities(maxResults = 10) {
  const data = getCoverageData();
  if (data.error) return data;

  const { files } = data;
  if (!files || !Array.isArray(files)) {
    return createError('No file-level coverage data available', {
      suggestion: 'Run tests with coverage to generate file data',
    });
  }

  // Score each file based on multiple factors
  const scored = files.map((file) => {
    let score = 0;

    // Factor 1: Low coverage (higher score for lower coverage)
    const avgCoverage =
      (file.coverage.statements +
        file.coverage.branches +
        file.coverage.functions +
        file.coverage.lines) /
      4;
    score += (100 - avgCoverage) * 2; // 0-200 points

    // Factor 2: Complexity (more uncovered lines = higher complexity)
    const uncoveredLines =
      file.totals.lines.total - file.totals.lines.covered;
    score += uncoveredLines * 0.5; // 0.5 points per uncovered line

    // Factor 3: File size (larger files with low coverage are priority)
    if (file.totals.lines.total > 100 && avgCoverage < 50) {
      score += 30; // Bonus for large, low-coverage files
    }

    // Factor 4: Critical paths (stores, api, core logic)
    if (
      file.path.includes('stores/') ||
      file.path.includes('/api/') ||
      file.path.includes('core/')
    ) {
      score += 20; // Bonus for critical paths
    }

    // Factor 5: Zero coverage files (highest priority)
    if (avgCoverage === 0) {
      score += 100; // Major bonus for untested files
    }

    return {
      path: file.path,
      currentCoverage: {
        statements: file.coverage.statements,
        branches: file.coverage.branches,
        functions: file.coverage.functions,
        lines: file.coverage.lines,
        average: Math.round(avgCoverage),
      },
      uncoveredLines,
      totalLines: file.totals.lines.total,
      priorityScore: Math.round(score),
      reasons: [],
    };
  });

  // Add priority reasons
  scored.forEach((item) => {
    if (item.currentCoverage.average === 0) {
      item.reasons.push('Zero coverage - completely untested');
    } else if (item.currentCoverage.average < 30) {
      item.reasons.push('Very low coverage (<30%)');
    } else if (item.currentCoverage.average < 50) {
      item.reasons.push('Low coverage (<50%)');
    }

    if (item.uncoveredLines > 50) {
      item.reasons.push(`High complexity (${item.uncoveredLines} uncovered lines)`);
    }

    if (
      item.path.includes('stores/') ||
      item.path.includes('/api/') ||
      item.path.includes('core/')
    ) {
      item.reasons.push('Critical path (stores/api/core)');
    }

    if (item.totalLines > 100 && item.currentCoverage.average < 50) {
      item.reasons.push('Large file with low coverage');
    }
  });

  // Sort by priority score (highest first)
  scored.sort((a, b) => b.priorityScore - a.priorityScore);

  const priorities = scored.slice(0, maxResults);

  return {
    totalFiles: files.length,
    priorityCount: priorities.length,
    priorities,
    recommendation:
      priorities.length > 0
        ? `Start with ${priorities[0].path} (priority score: ${priorities[0].priorityScore})`
        : 'All files have good coverage!',
  };
}

/**
 * Check if coverage meets thresholds
 */
function checkThresholds() {
  const data = getCoverageData();
  if (data.error) return data;

  const { current } = data;
  const coverage = current.coverage;

  const results = {
    frontend: {
      statements: {
        current: coverage.statements,
        threshold: THRESHOLDS.frontend.statements,
        passing: coverage.statements >= THRESHOLDS.frontend.statements,
      },
      branches: {
        current: coverage.branches,
        threshold: THRESHOLDS.frontend.branches,
        passing: coverage.branches >= THRESHOLDS.frontend.branches,
      },
      functions: {
        current: coverage.functions,
        threshold: THRESHOLDS.frontend.functions,
        passing: coverage.functions >= THRESHOLDS.frontend.functions,
      },
      lines: {
        current: coverage.lines,
        threshold: THRESHOLDS.frontend.lines,
        passing: coverage.lines >= THRESHOLDS.frontend.lines,
      },
    },
    overall: {
      current: coverage.statements,
      threshold: THRESHOLDS.overall,
      passing: coverage.statements >= THRESHOLDS.overall,
    },
  };

  const allPassing = Object.values(results.frontend).every((r) => r.passing);

  return {
    ...results,
    allPassing,
    summary: allPassing
      ? '✅ All coverage thresholds met'
      : '⚠️ Some coverage thresholds not met',
  };
}

// Create MCP server
const server = new Server(
  {
    name: 'lokifi-coverage',
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
        name: 'get_coverage_summary',
        description:
          'Get current test coverage summary with overall metrics, test counts, and threshold status',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_low_coverage_files',
        description:
          'Get list of files with coverage below specified threshold (default 80%)',
        inputSchema: {
          type: 'object',
          properties: {
            threshold: {
              type: 'number',
              description: 'Coverage threshold percentage (0-100)',
              default: 80,
            },
          },
        },
      },
      {
        name: 'get_coverage_trends',
        description:
          'Get coverage trends comparing current vs historical data',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_file_coverage',
        description:
          'Get detailed coverage information for a specific file (supports partial path matching)',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description:
                'Full or partial file path (e.g., "portfolioStore" or "components/dashboard")',
            },
          },
          required: ['filePath'],
        },
      },
      {
        name: 'check_coverage_thresholds',
        description:
          'Check if current coverage meets configured thresholds for frontend, backend, and overall',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_coverage_by_category',
        description:
          'Get coverage metrics grouped by directory/category (components/, lib/stores/, hooks/, etc.)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'suggest_test_priorities',
        description:
          'Smart recommendations for which files to test next based on coverage, complexity, and critical paths',
        inputSchema: {
          type: 'object',
          properties: {
            maxResults: {
              type: 'number',
              description: 'Maximum number of recommendations (default 10)',
              default: 10,
            },
          },
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
      case 'get_coverage_summary':
        result = getCoverageSummary();
        break;

      case 'get_low_coverage_files':
        result = getLowCoverageFiles(args?.threshold || 80);
        break;

      case 'get_coverage_trends':
        result = getCoverageTrends();
        break;

      case 'get_file_coverage':
        if (!args?.filePath) {
          result = { error: 'filePath argument is required' };
        } else {
          result = getFileCoverage(args.filePath);
        }
        break;

      case 'check_coverage_thresholds':
        result = checkThresholds();
        break;

      case 'get_coverage_by_category':
        result = getCoverageByCategory();
        break;

      case 'suggest_test_priorities':
        result = suggestTestPriorities(args?.maxResults || 10);
        break;

      default:
        result = createError(`Unknown tool: ${name}`, {
          availableTools: [
            'get_coverage_summary',
            'get_low_coverage_files',
            'get_coverage_trends',
            'get_file_coverage',
            'check_coverage_thresholds',
            'get_coverage_by_category',
            'suggest_test_priorities',
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
  console.error('Lokifi Coverage MCP Server running');
  console.error(`Coverage data: ${COVERAGE_DATA_PATH}`);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
