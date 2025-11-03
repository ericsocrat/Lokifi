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
 * Read and parse coverage data
 */
function getCoverageData() {
  try {
    if (!fs.existsSync(COVERAGE_DATA_PATH)) {
      return {
        error: 'Coverage data not found. Run: npm run test:coverage',
        path: COVERAGE_DATA_PATH,
      };
    }

    const data = JSON.parse(fs.readFileSync(COVERAGE_DATA_PATH, 'utf-8'));
    return data;
  } catch (error) {
    return {
      error: `Failed to read coverage data: ${error.message}`,
      path: COVERAGE_DATA_PATH,
    };
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
    return {
      error: `File not found: ${filePath}`,
      suggestion: 'Try a partial path match',
    };
  }

  return {
    path: file.path,
    coverage: file.coverage,
    totals: file.totals,
    uncoveredLines: file.uncoveredLines || [],
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
