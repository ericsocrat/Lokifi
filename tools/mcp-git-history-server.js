#!/usr/bin/env node

/**
 * Lokifi MCP Git History & Context Server
 *
 * Model Context Protocol server that provides searchable access to git commit history.
 * Recovers lost chat context by making development timeline queryable. Enables AI
 * assistants to understand project evolution and find session-specific work.
 *
 * Usage:
 *   node tools/mcp-git-history-server.js
 *
 * VS Code Configuration:
 *   Add to .vscode/settings.json:
 *   {
 *     "github.copilot.chat.mcpServers": {
 *       "lokifi-git": {
 *         "command": "node",
 *         "args": ["${workspaceFolder}/tools/mcp-git-history-server.js"]
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
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Repository root (one level up from tools/)
const REPO_ROOT = path.join(__dirname, '..');

/**
 * Execute git command safely
 */
function executeGit(command, options = {}) {
  try {
    const result = execSync(`git ${command}`, {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
      ...options,
    });
    return result.trim();
  } catch (error) {
    return {
      error: `Git command failed: ${error.message}`,
      command: `git ${command}`,
    };
  }
}

/**
 * Parse git log output into structured commits
 */
function parseGitLog(logOutput) {
  const commits = [];
  const commitBlocks = logOutput.split('\n\n\n');

  commitBlocks.forEach((block) => {
    if (!block.trim()) return;

    const lines = block.split('\n');
    const commit = {};

    // Parse header lines
    lines.forEach((line) => {
      if (line.startsWith('commit ')) {
        commit.hash = line.split(' ')[1];
      } else if (line.startsWith('Author: ')) {
        commit.author = line.substring(8);
      } else if (line.startsWith('Date: ')) {
        commit.date = line.substring(6).trim();
      } else if (line.trim() && !commit.message) {
        commit.message = line.trim();
      } else if (commit.message && line.trim()) {
        // Multi-line commit message
        commit.body = commit.body ? `${commit.body}\n${line.trim()}` : line.trim();
      }
    });

    if (commit.hash) {
      commits.push(commit);
    }
  });

  return commits;
}

/**
 * Search commits by keyword, date, or author
 */
function searchCommits(query, author = null, since = null, until = null, limit = 50) {
  let gitCommand = 'log --all';

  // Add filters
  if (author) {
    gitCommand += ` --author="${author}"`;
  }
  if (since) {
    gitCommand += ` --since="${since}"`;
  }
  if (until) {
    gitCommand += ` --until="${until}"`;
  }

  // Add format and limit
  gitCommand += ` --format="%H%n%an <%ae>%n%ai%n%s%n%b%n" -n ${limit}`;

  // Add grep if query provided
  if (query && query.trim() !== '') {
    gitCommand += ` --grep="${query}" -i`; // Case-insensitive search
  }

  const result = executeGit(gitCommand);
  if (result.error) return result;

  // Parse output
  const commits = [];
  const lines = result.split('\n');
  let currentCommit = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/^[0-9a-f]{40}$/)) {
      // New commit hash
      if (currentCommit) {
        commits.push(currentCommit);
      }
      currentCommit = {
        hash: line,
        shortHash: line.substring(0, 7),
      };
    } else if (currentCommit && !currentCommit.author) {
      currentCommit.author = line;
    } else if (currentCommit && !currentCommit.date) {
      currentCommit.date = line;
    } else if (currentCommit && !currentCommit.message) {
      currentCommit.message = line;
    } else if (currentCommit && line.trim()) {
      currentCommit.body = currentCommit.body
        ? `${currentCommit.body}\n${line}`
        : line;
    }
  }

  if (currentCommit) {
    commits.push(currentCommit);
  }

  return {
    query: query || 'all',
    filters: { author, since, until },
    count: commits.length,
    commits,
  };
}

/**
 * Get detailed information about a specific commit
 */
function getCommitDetails(commitHash) {
  if (!commitHash) {
    return {
      error: 'commitHash parameter is required',
      suggestion: 'Provide a commit hash (full or short)',
    };
  }

  // Get commit info
  const infoCommand = `show ${commitHash} --format="%H%n%an <%ae>%n%ai%n%s%n%b" --stat`;
  const info = executeGit(infoCommand);
  if (info.error) return info;

  // Get changed files
  const filesCommand = `diff-tree --no-commit-id --name-status -r ${commitHash}`;
  const files = executeGit(filesCommand);

  // Parse commit info
  const lines = info.split('\n');
  const commit = {
    hash: lines[0],
    shortHash: lines[0].substring(0, 7),
    author: lines[1],
    date: lines[2],
    message: lines[3],
    body: '',
    files: [],
    stats: '',
  };

  // Extract body and stats
  let bodyStarted = false;
  let statsStarted = false;

  for (let i = 4; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/^\s+\d+\s+file[s]?\s+changed/)) {
      statsStarted = true;
    }

    if (statsStarted) {
      commit.stats += (commit.stats ? '\n' : '') + line;
    } else if (line.trim()) {
      commit.body += (commit.body ? '\n' : '') + line;
    }
  }

  // Parse changed files
  if (!files.error) {
    files.split('\n').forEach((line) => {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        commit.files.push({
          status: parts[0],
          path: parts[1],
        });
      }
    });
  }

  return commit;
}

/**
 * Find work done in a specific session
 */
function findSessionWork(sessionNumber) {
  if (!sessionNumber) {
    return {
      error: 'sessionNumber parameter is required',
      suggestion: 'Provide a session number (e.g., 75, 91)',
    };
  }

  // Search for commits mentioning the session
  const searchPatterns = [
    `Session ${sessionNumber}`,
    `session ${sessionNumber}`,
    `Session${sessionNumber}`,
    `session${sessionNumber}`,
  ];

  const allCommits = [];

  searchPatterns.forEach((pattern) => {
    const result = searchCommits(pattern, null, null, null, 100);
    if (!result.error && result.commits) {
      allCommits.push(...result.commits);
    }
  });

  // Remove duplicates by hash
  const unique = allCommits.filter(
    (commit, index, self) =>
      index === self.findIndex((c) => c.hash === commit.hash)
  );

  // Sort by date (newest first)
  unique.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    session: sessionNumber,
    commitCount: unique.length,
    commits: unique,
    summary: unique.length > 0
      ? `Found ${unique.length} commits for Session ${sessionNumber}`
      : `No commits found for Session ${sessionNumber}`,
  };
}

/**
 * Analyze sprint progress (commits grouped by time period)
 */
function analyzeSprintProgress(since = '1 month ago', until = 'now') {
  // Get commits in date range
  const result = searchCommits('', null, since, until, 1000);
  if (result.error) return result;

  const commits = result.commits;

  // Group by week
  const weeklyStats = {};
  const authorStats = {};
  const fileStats = {};

  commits.forEach((commit) => {
    const date = new Date(commit.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
    const weekKey = weekStart.toISOString().split('T')[0];

    // Weekly commit count
    weeklyStats[weekKey] = (weeklyStats[weekKey] || 0) + 1;

    // Author contributions
    const authorName = commit.author.split('<')[0].trim();
    authorStats[authorName] = (authorStats[authorName] || 0) + 1;

    // Extract session info if present
    const sessionMatch = commit.message.match(/Session\s+(\d+)/i);
    if (sessionMatch) {
      const sessionNum = sessionMatch[1];
      fileStats[`Session ${sessionNum}`] = fileStats[`Session ${sessionNum}`] || [];
      fileStats[`Session ${sessionNum}`].push(commit);
    }
  });

  return {
    period: { since, until },
    totalCommits: commits.length,
    weeklyActivity: Object.keys(weeklyStats)
      .sort()
      .map((week) => ({
        week,
        commits: weeklyStats[week],
      })),
    authorContributions: Object.keys(authorStats)
      .map((author) => ({
        author,
        commits: authorStats[author],
      }))
      .sort((a, b) => b.commits - a.commits),
    sessionWork: Object.keys(fileStats).map((session) => ({
      session,
      commits: fileStats[session].length,
    })),
    recentCommits: commits.slice(0, 10),
  };
}

// Create MCP server
const server = new Server(
  {
    name: 'lokifi-git',
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
        name: 'search_commits',
        description:
          'Search git commit history by keyword, author, or date range. Returns matching commits with messages.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'Search keyword (e.g., "testing", "fix", "Session 75")',
              default: '',
            },
            author: {
              type: 'string',
              description: 'Filter by author name or email',
            },
            since: {
              type: 'string',
              description: 'Start date (e.g., "2024-01-01", "1 week ago")',
            },
            until: {
              type: 'string',
              description: 'End date (e.g., "2024-12-31", "now")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of commits to return',
              default: 50,
            },
          },
        },
      },
      {
        name: 'get_commit_details',
        description:
          'Get detailed information about a specific commit including full message, changed files, and statistics.',
        inputSchema: {
          type: 'object',
          properties: {
            commitHash: {
              type: 'string',
              description: 'Commit hash (full or short, e.g., "abc1234")',
            },
          },
          required: ['commitHash'],
        },
      },
      {
        name: 'find_session_work',
        description:
          'Find all commits related to a specific development session number.',
        inputSchema: {
          type: 'object',
          properties: {
            sessionNumber: {
              type: 'number',
              description: 'Session number (e.g., 75, 91)',
            },
          },
          required: ['sessionNumber'],
        },
      },
      {
        name: 'analyze_sprint_progress',
        description:
          'Analyze development progress over a time period with weekly activity, author contributions, and session breakdown.',
        inputSchema: {
          type: 'object',
          properties: {
            since: {
              type: 'string',
              description: 'Start date (e.g., "2024-01-01", "1 month ago")',
              default: '1 month ago',
            },
            until: {
              type: 'string',
              description: 'End date (e.g., "2024-12-31", "now")',
              default: 'now',
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
      case 'search_commits':
        result = searchCommits(
          args?.query || '',
          args?.author || null,
          args?.since || null,
          args?.until || null,
          args?.limit || 50
        );
        break;

      case 'get_commit_details':
        result = getCommitDetails(args?.commitHash);
        break;

      case 'find_session_work':
        result = findSessionWork(args?.sessionNumber);
        break;

      case 'analyze_sprint_progress':
        result = analyzeSprintProgress(
          args?.since || '1 month ago',
          args?.until || 'now'
        );
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
  console.error('Lokifi Git History & Context MCP Server running');
  console.error(`Repository root: ${REPO_ROOT}`);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
