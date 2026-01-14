#!/usr/bin/env node

/**
 * Lokifi MCP Codebase Analysis Server
 *
 * Model Context Protocol server for codebase structure analysis, dependency management,
 * and code quality metrics. Essential for staff-level engineering decisions.
 *
 * Usage:
 *   node tools/mcp-codebase-server.js
 *
 * VS Code Configuration:
 *   Add to .vscode/settings.json:
 *   {
 *     "github.copilot.chat.mcpServers": {
 *       "lokifi-codebase": {
 *         "command": "node",
 *         "args": ["${workspaceFolder}/tools/mcp-codebase-server.js"]
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
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

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
 * Execute shell command safely
 */
function execCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      ...options,
    });
    return result.toString().trim();
  } catch (error) {
    return null;
  }
}

/**
 * Get project structure summary
 */
function getProjectStructure() {
  try {
    const structure = {
      timestamp: new Date().toISOString(),
      root: PROJECT_ROOT,
      apps: {},
      totalFiles: 0,
      totalLines: 0,
    };

    // Analyze apps/frontend
    const frontendPath = path.join(PROJECT_ROOT, 'apps/frontend');
    if (fs.existsSync(frontendPath)) {
      structure.apps.frontend = analyzeDirectory(frontendPath, {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
        exclude: ['node_modules', '.next', 'coverage', 'dist'],
      });
    }

    // Analyze apps/backend
    const backendPath = path.join(PROJECT_ROOT, 'apps/backend');
    if (fs.existsSync(backendPath)) {
      structure.apps.backend = analyzeDirectory(backendPath, {
        extensions: ['.py'],
        exclude: ['__pycache__', '.pytest_cache', 'venv', '.venv', 'htmlcov'],
      });
    }

    // Calculate totals
    Object.values(structure.apps).forEach((app) => {
      structure.totalFiles += app.fileCount;
      structure.totalLines += app.totalLines;
    });

    return structure;
  } catch (error) {
    return createError('Failed to analyze project structure', {
      details: error.message,
      suggestion: 'Ensure project directories are accessible',
    });
  }
}

/**
 * Analyze directory recursively
 */
function analyzeDirectory(dirPath, options = {}) {
  const { extensions = [], exclude = [] } = options;
  const stats = {
    path: dirPath,
    fileCount: 0,
    totalLines: 0,
    directories: [],
    filesByExtension: {},
  };

  function walkDir(currentPath, relativePath = '') {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relPath = path.join(relativePath, entry.name);

      // Skip excluded directories
      if (exclude.some((ex) => relPath.includes(ex))) {
        continue;
      }

      if (entry.isDirectory()) {
        stats.directories.push(relPath);
        walkDir(fullPath, relPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.length === 0 || extensions.includes(ext)) {
          stats.fileCount++;

          // Count lines
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n').length;
            stats.totalLines += lines;

            // Track by extension
            if (!stats.filesByExtension[ext]) {
              stats.filesByExtension[ext] = { count: 0, lines: 0 };
            }
            stats.filesByExtension[ext].count++;
            stats.filesByExtension[ext].lines += lines;
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    }
  }

  walkDir(dirPath);
  return stats;
}

/**
 * Analyze dependencies in frontend (imports)
 */
function analyzeFrontendDependencies() {
  try {
    const frontendPath = path.join(PROJECT_ROOT, 'apps/frontend');
    const dependencies = {
      timestamp: new Date().toISOString(),
      internal: [],
      external: [],
      importGraph: {},
    };

    // Read package.json for external deps
    const packageJsonPath = path.join(frontendPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      dependencies.external = [
        ...Object.keys(packageJson.dependencies || {}),
        ...Object.keys(packageJson.devDependencies || {}),
      ];
    }

    // Analyze imports in source files
    const srcPath = path.join(frontendPath, 'src');
    if (fs.existsSync(srcPath)) {
      analyzeImportsRecursively(srcPath, dependencies, frontendPath);
    }

    return dependencies;
  } catch (error) {
    return createError('Failed to analyze frontend dependencies', {
      details: error.message,
      suggestion: 'Check apps/frontend directory structure',
    });
  }
}

/**
 * Analyze imports recursively
 */
function analyzeImportsRecursively(dirPath, dependencies, basePath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      analyzeImportsRecursively(fullPath, dependencies, basePath);
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const relativePath = path.relative(basePath, fullPath);

        // Extract imports
        const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
        const imports = [];
        let match;

        while ((match = importRegex.exec(content)) !== null) {
          imports.push(match[1]);
        }

        if (imports.length > 0) {
          dependencies.importGraph[relativePath] = imports;
          imports.forEach((imp) => {
            if (imp.startsWith('@/') || imp.startsWith('./') || imp.startsWith('../')) {
              if (!dependencies.internal.includes(imp)) {
                dependencies.internal.push(imp);
              }
            }
          });
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }
}

/**
 * Analyze backend dependencies (Python imports)
 */
function analyzeBackendDependencies() {
  try {
    const backendPath = path.join(PROJECT_ROOT, 'apps/backend');
    const dependencies = {
      timestamp: new Date().toISOString(),
      external: [],
      internal: [],
      importGraph: {},
    };

    // Read requirements.txt for external deps
    const requirementsPath = path.join(backendPath, 'requirements.txt');
    if (fs.existsSync(requirementsPath)) {
      const requirements = fs.readFileSync(requirementsPath, 'utf-8');
      dependencies.external = requirements
        .split('\n')
        .filter((line) => line.trim() && !line.startsWith('#'))
        .map((line) => line.split('==')[0].trim());
    }

    // Analyze imports in Python files
    const appPath = path.join(backendPath, 'app');
    if (fs.existsSync(appPath)) {
      analyzePythonImportsRecursively(appPath, dependencies, backendPath);
    }

    return dependencies;
  } catch (error) {
    return createError('Failed to analyze backend dependencies', {
      details: error.message,
      suggestion: 'Check apps/backend directory structure',
    });
  }
}

/**
 * Analyze Python imports recursively
 */
function analyzePythonImportsRecursively(dirPath, dependencies, basePath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory() && entry.name !== '__pycache__') {
      analyzePythonImportsRecursively(fullPath, dependencies, basePath);
    } else if (entry.isFile() && entry.name.endsWith('.py')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const relativePath = path.relative(basePath, fullPath);

        // Extract imports
        const importRegex = /^(?:from|import)\s+([\w.]+)/gm;
        const imports = [];
        let match;

        while ((match = importRegex.exec(content)) !== null) {
          imports.push(match[1]);
        }

        if (imports.length > 0) {
          dependencies.importGraph[relativePath] = imports;
          imports.forEach((imp) => {
            if (imp.startsWith('app.')) {
              if (!dependencies.internal.includes(imp)) {
                dependencies.internal.push(imp);
              }
            }
          });
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }
}

/**
 * Get file complexity metrics
 */
function getComplexityMetrics(filePath) {
  try {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(PROJECT_ROOT, filePath);

    if (!fs.existsSync(fullPath)) {
      return createError('File not found', {
        path: filePath,
        suggestion: 'Verify file path is correct',
      });
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    const ext = path.extname(fullPath);

    const metrics = {
      path: filePath,
      extension: ext,
      totalLines: lines.length,
      codeLines: 0,
      commentLines: 0,
      blankLines: 0,
      functions: 0,
      classes: 0,
      imports: 0,
      complexity: 'low',
    };

    // Analyze each line
    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === '') {
        metrics.blankLines++;
      } else if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('#') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('*')
      ) {
        metrics.commentLines++;
      } else {
        metrics.codeLines++;

        // Count functions
        if (/^(function|const.*=.*=>|async\s+function|export\s+function|def\s+)/.test(trimmed)) {
          metrics.functions++;
        }

        // Count classes
        if (/^(class|export\s+class)/.test(trimmed)) {
          metrics.classes++;
        }

        // Count imports
        if (/^(import|from.*import)/.test(trimmed)) {
          metrics.imports++;
        }
      }
    }

    // Calculate complexity estimate
    if (metrics.codeLines > 500 || metrics.functions > 20) {
      metrics.complexity = 'high';
    } else if (metrics.codeLines > 200 || metrics.functions > 10) {
      metrics.complexity = 'medium';
    }

    return metrics;
  } catch (error) {
    return createError('Failed to analyze file complexity', {
      path: filePath,
      details: error.message,
    });
  }
}

/**
 * Find circular dependencies
 */
function findCircularDependencies() {
  try {
    const result = {
      timestamp: new Date().toISOString(),
      frontend: { circular: [], analyzed: 0 },
      backend: { circular: [], analyzed: 0 },
    };

    // Analyze frontend
    const frontendDeps = analyzeFrontendDependencies();
    if (!frontendDeps.error) {
      const graph = frontendDeps.importGraph;
      result.frontend.analyzed = Object.keys(graph).length;
      result.frontend.circular = detectCycles(graph);
    }

    // Analyze backend
    const backendDeps = analyzeBackendDependencies();
    if (!backendDeps.error) {
      const graph = backendDeps.importGraph;
      result.backend.analyzed = Object.keys(graph).length;
      result.backend.circular = detectCycles(graph);
    }

    return result;
  } catch (error) {
    return createError('Failed to find circular dependencies', {
      details: error.message,
    });
  }
}

/**
 * Detect cycles in dependency graph using DFS
 */
function detectCycles(graph) {
  const visited = new Set();
  const recursionStack = new Set();
  const cycles = [];

  function dfs(node, path = []) {
    if (recursionStack.has(node)) {
      // Found a cycle
      const cycleStart = path.indexOf(node);
      const cycle = path.slice(cycleStart);
      cycles.push([...cycle, node]);
      return;
    }

    if (visited.has(node)) {
      return;
    }

    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const dependencies = graph[node] || [];
    for (const dep of dependencies) {
      if (graph[dep]) {
        dfs(dep, [...path]);
      }
    }

    recursionStack.delete(node);
  }

  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles;
}

/**
 * Get code quality metrics
 */
function getCodeQualityMetrics() {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      frontend: {},
      backend: {},
    };

    // Frontend ESLint issues
    const eslintResult = execCommand(
      'cd apps/frontend && npm run lint -- --format json 2>&1',
      { stdio: 'pipe' }
    );
    if (eslintResult) {
      try {
        const eslintData = JSON.parse(eslintResult);
        metrics.frontend.eslint = {
          totalFiles: eslintData.length || 0,
          errorCount: eslintData.reduce((sum, file) => sum + (file.errorCount || 0), 0),
          warningCount: eslintData.reduce((sum, file) => sum + (file.warningCount || 0), 0),
        };
      } catch {
        metrics.frontend.eslint = { error: 'Failed to parse ESLint output' };
      }
    }

    // Backend Ruff issues
    const ruffResult = execCommand('cd apps/backend && ruff check . --output-format json 2>&1');
    if (ruffResult) {
      try {
        const ruffData = JSON.parse(ruffResult);
        metrics.backend.ruff = {
          totalIssues: Array.isArray(ruffData) ? ruffData.length : 0,
          files: new Set(ruffData.map((issue) => issue.filename)).size,
        };
      } catch {
        metrics.backend.ruff = { error: 'Failed to parse Ruff output' };
      }
    }

    return metrics;
  } catch (error) {
    return createError('Failed to get code quality metrics', {
      details: error.message,
      suggestion: 'Run quality checks manually: npm run lint / ruff check',
    });
  }
}

/**
 * Analyze test file organization
 */
function analyzeTestOrganization() {
  try {
    const result = {
      timestamp: new Date().toISOString(),
      frontend: { tests: 0, files: [], coverage: null },
      backend: { tests: 0, files: [], coverage: null },
    };

    // Frontend tests
    const frontendTestPath = path.join(PROJECT_ROOT, 'apps/frontend/tests');
    if (fs.existsSync(frontendTestPath)) {
      result.frontend = analyzeTestDirectory(frontendTestPath, /\.(test|spec)\.(ts|tsx|js|jsx)$/);
    }

    // Backend tests
    const backendTestPath = path.join(PROJECT_ROOT, 'apps/backend/tests');
    if (fs.existsSync(backendTestPath)) {
      result.backend = analyzeTestDirectory(backendTestPath, /^test_.*\.py$/);
    }

    return result;
  } catch (error) {
    return createError('Failed to analyze test organization', {
      details: error.message,
    });
  }
}

/**
 * Analyze test directory
 */
function analyzeTestDirectory(dirPath, pattern) {
  const stats = {
    tests: 0,
    files: [],
    totalLines: 0,
  };

  function walkDir(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        walkDir(fullPath);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n').length;
          const relativePath = path.relative(PROJECT_ROOT, fullPath);

          // Count test cases
          const testMatches = content.match(/\b(it|test|describe|def test_)\(/g);
          const testCount = testMatches ? testMatches.length : 0;

          stats.tests += testCount;
          stats.totalLines += lines;
          stats.files.push({
            path: relativePath,
            tests: testCount,
            lines,
          });
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }
  }

  walkDir(dirPath);
  return stats;
}

// Create MCP server
const server = new Server(
  {
    name: 'lokifi-codebase',
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
        name: 'get_project_structure',
        description:
          'Get comprehensive project structure with file counts, line counts, and directory organization for frontend/backend',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'analyze_frontend_dependencies',
        description:
          'Analyze frontend dependencies including external packages, internal imports, and import graph for circular dependency detection',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'analyze_backend_dependencies',
        description:
          'Analyze backend Python dependencies including requirements.txt packages and internal module imports',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_file_complexity',
        description:
          'Get detailed complexity metrics for a specific file including lines of code, functions, classes, and complexity rating',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description:
                'Relative or absolute path to file (e.g., "apps/frontend/src/lib/stores/portfolioStore.tsx")',
            },
          },
          required: ['filePath'],
        },
      },
      {
        name: 'find_circular_dependencies',
        description:
          'Detect circular dependencies in frontend and backend import graphs - critical for identifying architecture issues',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_code_quality_metrics',
        description:
          'Get code quality metrics from ESLint (frontend) and Ruff (backend) including error/warning counts',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'analyze_test_organization',
        description:
          'Analyze test file organization including test counts, file structure, and test coverage distribution',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_dependency_impact',
        description:
          'Analyze impact of changing a file - shows which files import it (downstream dependencies)',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description:
                'Relative path to file to analyze (e.g., "src/lib/stores/portfolioStore.tsx")',
            },
          },
          required: ['filePath'],
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
      case 'get_project_structure':
        result = getProjectStructure();
        break;

      case 'analyze_frontend_dependencies':
        result = analyzeFrontendDependencies();
        break;

      case 'analyze_backend_dependencies':
        result = analyzeBackendDependencies();
        break;

      case 'get_file_complexity':
        if (!args?.filePath) {
          result = createError('filePath argument is required', {
            example: 'apps/frontend/src/lib/stores/portfolioStore.tsx',
          });
        } else {
          result = getComplexityMetrics(args.filePath);
        }
        break;

      case 'find_circular_dependencies':
        result = findCircularDependencies();
        break;

      case 'get_code_quality_metrics':
        result = getCodeQualityMetrics();
        break;

      case 'analyze_test_organization':
        result = analyzeTestOrganization();
        break;

      case 'get_dependency_impact':
        if (!args?.filePath) {
          result = createError('filePath argument is required');
        } else {
          // Analyze which files import this file
          const frontendDeps = analyzeFrontendDependencies();
          const backendDeps = analyzeBackendDependencies();

          const impactedFiles = [];

          // Check frontend
          if (frontendDeps.importGraph) {
            Object.entries(frontendDeps.importGraph).forEach(([file, imports]) => {
              if (imports.some((imp) => imp.includes(args.filePath))) {
                impactedFiles.push({ file, layer: 'frontend' });
              }
            });
          }

          // Check backend
          if (backendDeps.importGraph) {
            Object.entries(backendDeps.importGraph).forEach(([file, imports]) => {
              if (imports.some((imp) => imp.includes(args.filePath))) {
                impactedFiles.push({ file, layer: 'backend' });
              }
            });
          }

          result = {
            filePath: args.filePath,
            impactedFiles,
            impactCount: impactedFiles.length,
            recommendation:
              impactedFiles.length > 10
                ? '⚠️ High-impact file - changes require extensive testing'
                : '✅ Low-impact file - changes are isolated',
          };
        }
        break;

      default:
        result = createError(`Unknown tool: ${name}`, {
          availableTools: [
            'get_project_structure',
            'analyze_frontend_dependencies',
            'analyze_backend_dependencies',
            'get_file_complexity',
            'find_circular_dependencies',
            'get_code_quality_metrics',
            'analyze_test_organization',
            'get_dependency_impact',
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
  console.error('Lokifi Codebase Analysis MCP Server running');
  console.error(`Project root: ${PROJECT_ROOT}`);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
