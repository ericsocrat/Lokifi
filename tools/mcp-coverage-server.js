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

// Path to authoritative coverage config
const COVERAGE_CONFIG_PATH = path.join(
  __dirname,
  '../config/coverage.config.json'
);

// Fallback to dashboard data if config not available
const COVERAGE_DASHBOARD_PATH = path.join(
  __dirname,
  '../apps/frontend/coverage-dashboard/data.json'
);

/**
 * Load coverage configuration from authoritative source
 */
function loadCoverageConfig() {
  try {
    if (fs.existsSync(COVERAGE_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(COVERAGE_CONFIG_PATH, 'utf-8'));
    }
  } catch (error) {
    console.error('Failed to load coverage.config.json:', error.message);
  }
  return null;
}

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
 * Read and parse coverage data from config or dashboard
 */
function getCoverageData() {
  try {
    // Try config first (authoritative source)
    const config = loadCoverageConfig();
    if (config && config.current) {
      return {
        source: 'config',
        config,
        current: config.current,
        thresholds: config.thresholds,
        history: config.history || [],
        goals: config.goals || {},
      };
    }

    // Fall back to dashboard data
    if (fs.existsSync(COVERAGE_DASHBOARD_PATH)) {
      const data = JSON.parse(fs.readFileSync(COVERAGE_DASHBOARD_PATH, 'utf-8'));
      return {
        source: 'dashboard',
        data,
        current: data.current,
        history: data.history || [],
      };
    }

    return createError('Coverage data not found', {
      paths: [COVERAGE_CONFIG_PATH, COVERAGE_DASHBOARD_PATH],
      suggestion: 'Generate coverage with: cd apps/frontend && npm run test:coverage',
    });
  } catch (error) {
    return createError('Failed to read coverage data', {
      details: error.message,
      suggestion: 'Ensure coverage files are valid JSON',
    });
  }
}

/**
 * Get current coverage summary with authoritative config data
 */
function getCoverageSummary() {
  const data = getCoverageData();
  if (data.error) return data;

  const { current, thresholds, source } = data;

  // Support both config and dashboard formats
  const frontend = current.frontend || current.coverage;
  const backend = current.backend || {};
  const overall = current.overall || {};

  const frontendThresholds = thresholds?.frontend || {};
  const backendThresholds = thresholds?.backend || {};
  const overallThresholds = thresholds?.overall || {};

  const summary = {
    source,
    timestamp: new Date().toISOString(),
    frontend: {
      current: {
        lines: frontend.lines,
        branches: frontend.branches,
        functions: frontend.functions,
        statements: frontend.statements,
      },
      thresholds: frontendThresholds,
      tests: {
        total: frontend.totalTests || 0,
        passing: frontend.passingTests || 0,
        skipped: frontend.skippedTests || 0,
        files: frontend.testFiles || 0,
      },
      status: frontend.status || 'unknown',
    },
    backend: {
      current: {
        lines: backend.lines,
        branches: backend.branches,
        functions: backend.functions,
        statements: backend.statements,
      },
      thresholds: backendThresholds,
      tests: {
        total: backend.totalTests || 0,
        passing: backend.passingTests || 0,
        skipped: backend.skippedTests || 0,
        files: backend.testFiles || 0,
      },
      status: backend.status || 'unknown',
    },
    overall: {
      current: {
        lines: overall.lines,
        branches: overall.branches,
        functions: overall.functions,
        statements: overall.statements,
      },
      thresholds: overallThresholds,
      tests: {
        total: overall.totalTests || 0,
        passing: overall.passingTests || 0,
        skipped: overall.skippedTests || 0,
      },
      status: overall.status || 'unknown',
    },
  };

  // Calculate threshold status
  summary.frontend.thresholdStatus = {
    lines: frontend.lines >= (frontendThresholds.lines || 0),
    branches: frontend.branches >= (frontendThresholds.branches || 0),
    functions: frontend.functions >= (frontendThresholds.functions || 0),
    statements: frontend.statements >= (frontendThresholds.statements || 0),
  };

  summary.backend.thresholdStatus = {
    lines: backend.lines >= (backendThresholds.lines || 0),
    branches: backend.branches >= (backendThresholds.branches || 0),
    functions: backend.functions >= (backendThresholds.functions || 0),
    statements: backend.statements >= (backendThresholds.statements || 0),
  };

  summary.overall.thresholdStatus = {
    lines: overall.lines >= (overallThresholds.lines || 0),
    branches: overall.branches >= (overallThresholds.branches || 0),
    functions: overall.functions >= (overallThresholds.functions || 0),
    statements: overall.statements >= (overallThresholds.statements || 0),
  };

  return summary;
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
 * Get detailed comparison between frontend and backend coverage
 */
function getDetailedComparison() {
  const data = getCoverageData();
  if (data.error) return data;

  const { current, thresholds } = data;
  const frontend = current.frontend || {};
  const backend = current.backend || {};
  const overall = current.overall || {};

  const frontendThresholds = thresholds?.frontend || {};
  const backendThresholds = thresholds?.backend || {};

  const metrics = ['lines', 'branches', 'functions', 'statements'];

  const comparison = {
    timestamp: new Date().toISOString(),
    frontend: {
      coverage: metrics.reduce((acc, m) => ({
        ...acc,
        [m]: {
          current: frontend[m],
          threshold: frontendThresholds[m],
          gap: Math.max(0, (frontendThresholds[m] || 0) - (frontend[m] || 0)),
          status: frontend[m] >= (frontendThresholds[m] || 0) ? '✅' : '⚠️',
        },
      }), {}),
      tests: {
        total: frontend.totalTests || 0,
        passing: frontend.passingTests || 0,
        failing: frontend.failingTests || 0,
        skipped: frontend.skippedTests || 0,
        files: frontend.testFiles || 0,
        passRate: frontend.totalTests
          ? Math.round((frontend.passingTests / frontend.totalTests) * 100)
          : 0,
      },
      status: frontend.status || 'unknown',
      lastMeasured: frontend.lastMeasured,
      notes: frontend.notes,
    },
    backend: {
      coverage: metrics.reduce((acc, m) => ({
        ...acc,
        [m]: {
          current: backend[m],
          threshold: backendThresholds[m],
          gap: Math.max(0, (backendThresholds[m] || 0) - (backend[m] || 0)),
          status: backend[m] >= (backendThresholds[m] || 0) ? '✅' : '⚠️',
        },
      }), {}),
      tests: {
        total: backend.totalTests || 0,
        passing: backend.passingTests || 0,
        failing: backend.failingTests || 0,
        skipped: backend.skippedTests || 0,
        files: backend.testFiles || 0,
        passRate: backend.totalTests
          ? Math.round((backend.passingTests / backend.totalTests) * 100)
          : 0,
      },
      status: backend.status || 'unknown',
      lastMeasured: backend.lastMeasured,
      notes: backend.notes,
    },
    overall: {
      coverage: metrics.reduce((acc, m) => ({
        ...acc,
        [m]: overall[m],
      }), {}),
      tests: {
        total: overall.totalTests || 0,
        passing: overall.passingTests || 0,
        failing: overall.failingTests || 0,
        skipped: overall.skippedTests || 0,
      },
      status: overall.status || 'unknown',
      lastMeasured: overall.lastMeasured,
    },
    analysis: {
      frontendLeading: frontend.lines > backend.lines,
      frontendGap: Math.round((frontend.lines || 0) - (backend.lines || 0) * 10) / 10,
      strongestArea: 'frontend',
      needsAttention: backend.lines < (backendThresholds.lines || 80) ? 'backend' : 'none',
      recommendation: backend.lines < (backendThresholds.lines || 80)
        ? '⚠️ Backend coverage below threshold - prioritize backend test improvements'
        : '✅ All areas meeting thresholds',
    },
  };

  return comparison;
}

/**
 * Get historical trends and projections
 */
function getCoverageTrendsDetailed() {
  const data = getCoverageData();
  if (data.error) return data;

  const { current, history } = data;
  if (!history || history.length === 0) {
    return {
      message: 'No historical data available',
      current: current.frontend || current.coverage,
      suggestion: 'Historical tracking starts after multiple test runs',
    };
  }

  // Sort history by date (newest first)
  const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Get recent and older entries
  const recent = sorted[0];
  const older = sorted[sorted.length - 1];

  const frontend = current.frontend || {};
  const recentFrontend = recent.frontend || {};

  const trends = {
    timeline: {
      earliest: older.date,
      latest: recent.date,
      current: new Date().toISOString().split('T')[0],
      recordsAvailable: history.length,
    },
    frontend: {
      current: frontend.lines,
      previousRecord: recentFrontend.lines,
      change: Math.round((frontend.lines - (recentFrontend.lines || 0)) * 100) / 100,
      trend: frontend.lines > (recentFrontend.lines || 0) ? '📈 improving' : '📉 declining',
      historicalMin: Math.min(...sorted.map((h) => h.frontend?.lines || Infinity)),
      historicalMax: Math.max(...sorted.map((h) => h.frontend?.lines || -Infinity)),
    },
    milestones: history.slice(0, 5).map((h) => ({
      date: h.date,
      frontend: h.frontend,
      backend: h.backend,
      milestone: h.milestone,
    })),
    projection: {
      weeksAt80: frontend.lines >= 80 ? 'achieved' : 'target',
      estimatedWeeks: frontend.lines >= 80 ? 0 : Math.ceil((80 - frontend.lines) / 5),
    },
  };

  return trends;
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
 * Check if coverage meets thresholds (using config as authoritative source)
 */
function checkThresholds() {
  const data = getCoverageData();
  if (data.error) return data;

  const { current, thresholds } = data;

  const frontend = current.frontend || {};
  const backend = current.backend || {};
  const overall = current.overall || {};

  const frontendThresholds = thresholds?.frontend || {};
  const backendThresholds = thresholds?.backend || {};
  const overallThresholds = thresholds?.overall || {};

  const results = {
    timestamp: new Date().toISOString(),
    frontend: {
      lines: {
        current: frontend.lines,
        threshold: frontendThresholds.lines,
        passing: frontend.lines >= (frontendThresholds.lines || 0),
      },
      branches: {
        current: frontend.branches,
        threshold: frontendThresholds.branches,
        passing: frontend.branches >= (frontendThresholds.branches || 0),
      },
      functions: {
        current: frontend.functions,
        threshold: frontendThresholds.functions,
        passing: frontend.functions >= (frontendThresholds.functions || 0),
      },
      statements: {
        current: frontend.statements,
        threshold: frontendThresholds.statements,
        passing: frontend.statements >= (frontendThresholds.statements || 0),
      },
    },
    backend: {
      lines: {
        current: backend.lines,
        threshold: backendThresholds.lines,
        passing: backend.lines >= (backendThresholds.lines || 0),
      },
      branches: {
        current: backend.branches,
        threshold: backendThresholds.branches,
        passing: backend.branches >= (backendThresholds.branches || 0),
      },
      functions: {
        current: backend.functions,
        threshold: backendThresholds.functions,
        passing: backend.functions >= (backendThresholds.functions || 0),
      },
      statements: {
        current: backend.statements,
        threshold: backendThresholds.statements,
        passing: backend.statements >= (backendThresholds.statements || 0),
      },
    },
    overall: {
      lines: {
        current: overall.lines,
        threshold: overallThresholds.lines,
        passing: overall.lines >= (overallThresholds.lines || 0),
      },
      branches: {
        current: overall.branches,
        threshold: overallThresholds.branches,
        passing: overall.branches >= (overallThresholds.branches || 0),
      },
      functions: {
        current: overall.functions,
        threshold: overallThresholds.functions,
        passing: overall.functions >= (overallThresholds.functions || 0),
      },
      statements: {
        current: overall.statements,
        threshold: overallThresholds.statements,
        passing: overall.statements >= (overallThresholds.statements || 0),
      },
    },
  };

  // Calculate overall pass status
  const frontendPassing = Object.values(results.frontend).every((m) => m.passing);
  const backendPassing = Object.values(results.backend).every((m) => m.passing);
  const overallPassing = Object.values(results.overall).every((m) => m.passing);

  return {
    ...results,
    summary: {
      frontendPassing,
      backendPassing,
      overallPassing,
      allPassing: frontendPassing && backendPassing && overallPassing,
    },
    recommendation:
      frontendPassing && backendPassing && overallPassing
        ? '✅ All coverage thresholds met - ready to merge'
        : '⚠️ Some coverage thresholds not met - review before merging',
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
          'Get current test coverage summary with frontend/backend breakdown, thresholds, and test counts',
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
          'Get coverage trends comparing current vs historical data with projections',
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
          'Check if current coverage meets configured thresholds for frontend, backend, and overall - uses config/coverage.config.json as authoritative source',
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
      {
        name: 'get_detailed_comparison',
        description:
          'Get detailed side-by-side comparison of frontend vs backend coverage with gap analysis and recommendations',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_coverage_trends_detailed',
        description:
          'Get historical coverage trends with milestones, projections, and improvement tracking',
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
        result = getCoverageTrendsDetailed();
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

      case 'get_detailed_comparison':
        result = getDetailedComparison();
        break;

      case 'get_coverage_trends_detailed':
        result = getCoverageTrendsDetailed();
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
            'get_detailed_comparison',
            'get_coverage_trends_detailed',
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
  console.error('Lokifi Coverage MCP Server running');
  console.error(`Authoritative config: ${COVERAGE_CONFIG_PATH}`);
  console.error(`Fallback dashboard: ${COVERAGE_DASHBOARD_PATH}`);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
