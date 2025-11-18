#!/usr/bin/env node

/**
 * Lokifi MCP Documentation Search Server
 *
 * Model Context Protocol server that provides intelligent search across all project
 * documentation folders. Enables AI assistants to find guides, checklists, and
 * technical documentation instantly.
 *
 * Usage:
 *   node tools/mcp-docs-search-server.js
 *
 * VS Code Configuration:
 *   Add to .vscode/settings.json:
 *   {
 *     "github.copilot.chat.mcpServers": {
 *       "lokifi-docs": {
 *         "command": "node",
 *         "args": ["${workspaceFolder}/tools/mcp-docs-search-server.js"]
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

// Documentation root directory
const DOCS_ROOT = path.join(__dirname, '../docs');

// Documentation categories to search
const DOC_CATEGORIES = [
  'guides',
  'testing',
  'deployment',
  'ci-cd',
  'development',
  'security',
  'architecture',
  'api',
  'monitoring',
  'processes',
  'troubleshooting',
  'plans',
];

// In-memory cache for docs metadata
let docsCache = null;
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
 * Get cached docs or load fresh
 */
function getCachedDocs() {
  const now = Date.now();
  if (docsCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    return docsCache;
  }

  const docs = findMarkdownFiles(DOCS_ROOT);
  docsCache = docs;
  cacheTimestamp = now;
  return docs;
}

/**
 * Recursively find all markdown files in a directory
 */
function findMarkdownFiles(dir, fileList = []) {
  try {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Skip node_modules, .git, and other hidden directories
        if (!file.startsWith('.') && file !== 'node_modules') {
          findMarkdownFiles(filePath, fileList);
        }
      } else if (file.endsWith('.md')) {
        fileList.push({
          path: filePath,
          relativePath: path.relative(DOCS_ROOT, filePath),
          name: file,
          category: path.relative(DOCS_ROOT, filePath).split(path.sep)[0],
        });
      }
    });

    return fileList;
  } catch (error) {
    return fileList;
  }
}

/**
 * Read file content safely
 */
function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    return null;
  }
}

/**
 * Search documentation files by keyword or topic
 */
function searchDocs(query, category = null) {
  if (!query || query.trim() === '') {
    return createError('Query parameter is required', {
      suggestion: 'Provide a search keyword or topic',
      examples: ['deployment', 'testing patterns', 'CI/CD'],
    });
  }

  const queryLower = query.toLowerCase();
  const allFiles = getCachedDocs();

  // Filter by category if specified
  let filesToSearch = allFiles;
  if (category) {
    const categoryLower = category.toLowerCase();
    filesToSearch = allFiles.filter((f) =>
      f.category.toLowerCase().includes(categoryLower)
    );
  }

  // Search through file contents
  const results = [];

  filesToSearch.forEach((file) => {
    const content = readFileContent(file.path);
    if (!content) return;

    // Check if query appears in content
    const lines = content.split('\n');
    const matches = [];

    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(queryLower)) {
        // Get context (2 lines before and after)
        const contextStart = Math.max(0, index - 2);
        const contextEnd = Math.min(lines.length, index + 3);
        const context = lines.slice(contextStart, contextEnd).join('\n');

        matches.push({
          lineNumber: index + 1,
          line: line.trim(),
          context,
        });
      }
    });

    if (matches.length > 0) {
      // Extract title from first heading
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : file.name;

      results.push({
        file: file.relativePath,
        title,
        category: file.category,
        matchCount: matches.length,
        matches: matches.slice(0, 5), // Top 5 matches per file
        path: file.path,
      });
    }
  });

  // Sort by match count (most relevant first)
  results.sort((a, b) => b.matchCount - a.matchCount);

  return {
    query,
    category: category || 'all',
    totalFiles: filesToSearch.length,
    resultsCount: results.length,
    results: results.slice(0, 20), // Top 20 most relevant files
  };
}

/**
 * Get full content of a specific documentation file
 */
function getDocContent(filePath) {
  if (!filePath) {
    return createError('filePath parameter is required', {
      suggestion: 'Provide a file path (can be relative or partial)',
    });
  }

  const allFiles = getCachedDocs();

  // Try exact match first
  let targetFile = allFiles.find((f) => f.relativePath === filePath);

  // Try partial match if exact match fails
  if (!targetFile) {
    const pathLower = filePath.toLowerCase();
    targetFile = allFiles.find(
      (f) =>
        f.relativePath.toLowerCase().includes(pathLower) ||
        f.name.toLowerCase().includes(pathLower)
    );
  }

  if (!targetFile) {
    return createError(`File not found: ${filePath}`, {
      suggestion: 'Use search_docs or list_docs_by_category to find files',
      availableFiles: allFiles.slice(0, 10).map((f) => f.relativePath),
    });
  }

  const content = readFileContent(targetFile.path);
  if (!content) {
    return {
      error: `Failed to read file: ${targetFile.path}`,
    };
  }

  // Extract metadata
  const lines = content.split('\n');
  const headings = lines
    .filter((line) => line.startsWith('#'))
    .map((line) => ({
      level: line.match(/^#+/)[0].length,
      text: line.replace(/^#+\s*/, ''),
    }));

  return {
    file: targetFile.relativePath,
    category: targetFile.category,
    headings,
    lineCount: lines.length,
    content,
    path: targetFile.path,
  };
}

/**
 * List all documentation files by category
 */
function listDocsByCategory(category = null) {
  const allFiles = getCachedDocs();

  // Group by category
  const grouped = {};

  allFiles.forEach((file) => {
    const cat = file.category;
    if (!grouped[cat]) {
      grouped[cat] = [];
    }
    grouped[cat].push({
      name: file.name,
      path: file.relativePath,
    });
  });

  // Filter by category if specified
  if (category) {
    const categoryLower = category.toLowerCase();
    const matchingCategory = Object.keys(grouped).find((cat) =>
      cat.toLowerCase().includes(categoryLower)
    );

    if (matchingCategory) {
      return {
        category: matchingCategory,
        fileCount: grouped[matchingCategory].length,
        files: grouped[matchingCategory],
      };
    } else {
      return createError(`Category not found: ${category}`, {
        availableCategories: Object.keys(grouped),
        suggestion: 'Use one of the available categories',
      });
    }
  }

  // Return all categories
  return {
    categories: Object.keys(grouped).map((cat) => ({
      name: cat,
      fileCount: grouped[cat].length,
      files: grouped[cat],
    })),
    totalCategories: Object.keys(grouped).length,
    totalFiles: allFiles.length,
  };
}

/**
 * Get recently modified documentation files
 */
function getRecentDocs(days = 30, category = null) {
  const allFiles = getCachedDocs();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  // Filter by modification time
  const recentFiles = allFiles
    .map((file) => {
      try {
        const stats = fs.statSync(file.path);
        return {
          ...file,
          modifiedAt: stats.mtime,
          modifiedDaysAgo: Math.floor(
            (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)
          ),
        };
      } catch (error) {
        return null;
      }
    })
    .filter((file) => file && file.modifiedAt >= cutoffDate);

  // Filter by category if specified
  let results = recentFiles;
  if (category) {
    const categoryLower = category.toLowerCase();
    results = recentFiles.filter((f) =>
      f.category.toLowerCase().includes(categoryLower)
    );
  }

  // Sort by modification time (newest first)
  results.sort((a, b) => b.modifiedAt - a.modifiedAt);

  return {
    days,
    category: category || 'all',
    cutoffDate: cutoffDate.toISOString(),
    count: results.length,
    recentDocs: results.map((f) => ({
      file: f.relativePath,
      category: f.category,
      modifiedAt: f.modifiedAt.toISOString(),
      modifiedDaysAgo: f.modifiedDaysAgo,
    })),
  };
}

/**
 * Find related documentation by analyzing content
 */
function findRelatedDocs(filePath, maxResults = 10) {
  if (!filePath) {
    return createError('filePath parameter is required', {
      suggestion: 'Provide a file path to find related docs',
    });
  }

  const allFiles = getCachedDocs();

  // Find the source file
  const pathLower = filePath.toLowerCase();
  const sourceFile = allFiles.find(
    (f) =>
      f.relativePath.toLowerCase() === pathLower ||
      f.relativePath.toLowerCase().includes(pathLower) ||
      f.name.toLowerCase().includes(pathLower)
  );

  if (!sourceFile) {
    return createError(`File not found: ${filePath}`, {
      suggestion: 'Use list_docs_by_category to find available files',
      availableFiles: allFiles.slice(0, 10).map((f) => f.relativePath),
    });
  }

  const sourceContent = readFileContent(sourceFile.path);
  if (!sourceContent) {
    return createError(`Failed to read source file`, {
      path: sourceFile.path,
    });
  }

  // Extract keywords from source (headings, bold text, links)
  const headings = sourceContent.match(/^#+\s+(.+)$/gm) || [];
  const links = sourceContent.match(/\[([^\]]+)\]\([^)]+\)/g) || [];
  const keywords = new Set();

  headings.forEach((h) => {
    const text = h.replace(/^#+\s+/, '').toLowerCase();
    text.split(/\s+/).forEach((word) => {
      if (word.length > 3) keywords.add(word);
    });
  });

  // Score other files by relevance
  const scored = [];

  allFiles.forEach((file) => {
    if (file.path === sourceFile.path) return; // Skip self

    let score = 0;

    // Same category bonus
    if (file.category === sourceFile.category) score += 10;

    const content = readFileContent(file.path);
    if (content) {
      const contentLower = content.toLowerCase();

      // Check for cross-links
      if (
        content.includes(sourceFile.name) ||
        sourceContent.includes(file.name)
      ) {
        score += 15;
      }

      // Keyword matches
      keywords.forEach((keyword) => {
        if (contentLower.includes(keyword)) score += 2;
      });

      // Extract title for display
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : file.name;

      if (score > 0) {
        scored.push({ file, score, title });
      }
    }
  });

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  const related = scored.slice(0, maxResults).map((s) => ({
    file: s.file.relativePath,
    title: s.title,
    category: s.file.category,
    relevanceScore: s.score,
  }));

  return {
    sourceFile: sourceFile.relativePath,
    relatedCount: related.length,
    relatedDocs: related,
  };
}

/**
 * Search checklists.md for process workflows
 */
function searchChecklists(query = '') {
  const checklistsPath = path.join(DOCS_ROOT, 'checklists.md');

  if (!fs.existsSync(checklistsPath)) {
    return createError('checklists.md not found', {
      path: checklistsPath,
      suggestion: 'Ensure /docs/checklists.md exists',
    });
  }

  const content = readFileContent(checklistsPath);
  if (!content) {
    return {
      error: 'Failed to read checklists.md',
    };
  }

  // Extract all checklist sections (## headers)
  const sections = [];
  const lines = content.split('\n');
  let currentSection = null;
  let currentContent = [];

  lines.forEach((line) => {
    if (line.startsWith('## ')) {
      // Save previous section
      if (currentSection) {
        sections.push({
          title: currentSection,
          content: currentContent.join('\n'),
          itemCount: currentContent.filter((l) => l.trim().startsWith('- [')).length,
        });
      }

      // Start new section
      currentSection = line.replace('## ', '');
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  });

  // Save last section
  if (currentSection) {
    sections.push({
      title: currentSection,
      content: currentContent.join('\n'),
      itemCount: currentContent.filter((l) => l.trim().startsWith('- [')).length,
    });
  }

  // Filter by query if provided
  let results = sections;
  if (query && query.trim() !== '') {
    const queryLower = query.toLowerCase();
    results = sections.filter(
      (s) =>
        s.title.toLowerCase().includes(queryLower) ||
        s.content.toLowerCase().includes(queryLower)
    );
  }

  return {
    query: query || 'all',
    totalSections: sections.length,
    matchingChecklists: results.length,
    checklists: results,
  };
}

// Create MCP server
const server = new Server(
  {
    name: 'lokifi-docs',
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
        name: 'search_docs',
        description:
          'Search across all documentation files by keyword or topic. Returns matching files with context snippets.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'Search keyword or topic (e.g., "deployment", "testing patterns", "CI/CD")',
            },
            category: {
              type: 'string',
              description:
                'Filter by category (e.g., "guides", "testing", "deployment")',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_doc_content',
        description:
          'Get full content of a specific documentation file (supports partial path matching).',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description:
                'Full or partial file path (e.g., "workflow.md", "guides/testing")',
            },
          },
          required: ['filePath'],
        },
      },
      {
        name: 'list_docs_by_category',
        description:
          'List all documentation files organized by category. Optionally filter by specific category.',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Category to filter (e.g., "guides", "testing")',
            },
          },
        },
      },
      {
        name: 'search_checklists',
        description:
          'Search checklists.md for process workflows and standard procedures.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'Search keyword (e.g., "pre-commit", "deployment", "security")',
              default: '',
            },
          },
        },
      },
      {
        name: 'get_recent_docs',
        description:
          'Get documentation files modified within the last N days. Useful for tracking updates and finding latest guides.',
        inputSchema: {
          type: 'object',
          properties: {
            days: {
              type: 'number',
              description: 'Number of days to look back (default 30)',
              default: 30,
            },
            category: {
              type: 'string',
              description: 'Filter by category (optional)',
            },
          },
        },
      },
      {
        name: 'find_related_docs',
        description:
          'Find documentation files related to a given file by analyzing cross-links, shared keywords, and categories.',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description:
                'Source file path (full or partial)',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of related docs to return (default 10)',
              default: 10,
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
      case 'search_docs':
        result = searchDocs(args?.query, args?.category || null);
        break;

      case 'get_doc_content':
        result = getDocContent(args?.filePath);
        break;

      case 'list_docs_by_category':
        result = listDocsByCategory(args?.category || null);
        break;

      case 'search_checklists':
        result = searchChecklists(args?.query || '');
        break;

      case 'get_recent_docs':
        result = getRecentDocs(args?.days || 30, args?.category || null);
        break;

      case 'find_related_docs':
        if (!args?.filePath) {
          result = createError('filePath argument is required', {
            suggestion: 'Provide a file path',
          });
        } else {
          result = findRelatedDocs(args.filePath, args?.maxResults || 10);
        }
        break;

      default:
        result = createError(`Unknown tool: ${name}`, {
          availableTools: [
            'search_docs',
            'get_doc_content',
            'list_docs_by_category',
            'search_checklists',
            'get_recent_docs',
            'find_related_docs',
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
  console.error('Lokifi Documentation Search MCP Server running');
  console.error(`Documentation root: ${DOCS_ROOT}`);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
