# Lokifi Git History & Context MCP Server

**Status**: ✅ Production Ready
**Purpose**: Searchable git commit history - recovers lost chat context by making development timeline queryable

## Quick Start

### 1. Install Dependencies

```powershell
cd tools
npm install
```

### 2. Configure VS Code

Already configured in `.vscode/settings.json`:

```json
{
  "github.copilot.chat.mcpServers": {
    "lokifi-git": {
      "command": "node",
      "args": ["${workspaceFolder}/tools/mcp-git-history-server.js"]
    }
  }
}
```

### 3. Restart VS Code

Reload VS Code to activate the MCP server.

### 4. Test the Server

Ask Copilot:
- "What work was done in Session 75?"
- "Search commits for testing patterns"
- "Show me recent development progress"
- "Find commits by ericsocrat"

## Available Tools

### 1. `search_commits`
Search git commit history by keyword, author, or date range.

**Example Queries**:
- "Search for testing commits"
- "Find Session 75 work"
- "Show commits from last week"

**Parameters**:
- `query` (optional): Search keyword (e.g., "testing", "fix", "Session 75")
- `author` (optional): Filter by author name or email
- `since` (optional): Start date (e.g., "2024-01-01", "1 week ago")
- `until` (optional): End date (e.g., "2024-12-31", "now")
- `limit` (optional): Maximum commits to return (default: 50)

**Returns**:
```json
{
  "query": "testing",
  "filters": { "author": null, "since": null, "until": null },
  "count": 23,
  "commits": [
    {
      "hash": "abc1234567890...",
      "shortHash": "abc1234",
      "author": "Eric Socrat <eric@example.com>",
      "date": "2024-11-18 10:30:00 -0500",
      "message": "feat(testing): add AsyncMock pattern tests",
      "body": "Session 77: Implemented 157 backend tests using AsyncMock pattern..."
    }
  ]
}
```

### 2. `get_commit_details`
Get detailed information about a specific commit.

**Example Queries**:
- "Show me details for commit abc1234"
- "What changed in the last commit?"
- "Get full message for commit xyz789"

**Parameters**:
- `commitHash` (required): Commit hash (full or short, e.g., "abc1234")

**Returns**:
```json
{
  "hash": "abc1234567890...",
  "shortHash": "abc1234",
  "author": "Eric Socrat <eric@example.com>",
  "date": "2024-11-18 10:30:00 -0500",
  "message": "feat(testing): add AsyncMock pattern tests",
  "body": "Session 77: Implemented 157 backend tests...\n\nValidation:\n- All tests passing\n- Coverage increased 30%",
  "files": [
    { "status": "M", "path": "apps/backend/tests/test_crypto.py" },
    { "status": "A", "path": "docs/guides/testing/patterns.md" }
  ],
  "stats": "2 files changed, 450 insertions(+), 20 deletions(-)"
}
```

### 3. `find_session_work`
Find all commits related to a specific development session.

**Example Queries**:
- "What was done in Session 75?"
- "Show me Session 91 commits"
- "Find work from session 80"

**Parameters**:
- `sessionNumber` (required): Session number (e.g., 75, 91)

**Returns**:
```json
{
  "session": 75,
  "commitCount": 3,
  "commits": [
    {
      "hash": "def456...",
      "shortHash": "def456",
      "author": "Eric Socrat <eric@example.com>",
      "date": "2024-10-15 14:20:00 -0500",
      "message": "feat(types): Session 75 - arg-type elimination patterns",
      "body": "Implemented 9 patterns for arg-type elimination..."
    }
  ],
  "summary": "Found 3 commits for Session 75"
}
```

### 4. `analyze_sprint_progress`
Analyze development progress over a time period.

**Example Queries**:
- "Show development progress this month"
- "Analyze last sprint's work"
- "What was accomplished in the last 2 weeks?"

**Parameters**:
- `since` (optional): Start date (default: "1 month ago")
- `until` (optional): End date (default: "now")

**Returns**:
```json
{
  "period": { "since": "1 month ago", "until": "now" },
  "totalCommits": 87,
  "weeklyActivity": [
    { "week": "2024-10-20", "commits": 12 },
    { "week": "2024-10-27", "commits": 18 },
    { "week": "2024-11-03", "commits": 15 }
  ],
  "authorContributions": [
    { "author": "Eric Socrat", "commits": 87 }
  ],
  "sessionWork": [
    { "session": "Session 75", "commits": 3 },
    { "session": "Session 80", "commits": 5 }
  ],
  "recentCommits": [
    { "hash": "abc123...", "message": "feat: latest feature" }
  ]
}
```

### 5. `find_commits_by_file` 🆕
Get commit history for a specific file.

**Example Queries**:
- "Show commits that modified portfolioStore.tsx"
- "What's the history of test-runner.ps1?"
- "Find all changes to mcp-coverage-server.js"

**Parameters**:
- `filePath` (required): File path (full or partial, relative to repo root)
- `limit` (optional): Maximum commits to return (default: 50)

**Returns**:
```json
{
  "file": "apps/frontend/src/lib/stores/portfolioStore.tsx",
  "commitCount": 12,
  "commits": [
    {
      "hash": "abc1234567890...",
      "shortHash": "abc1234",
      "author": "Eric Socrat <eric@example.com>",
      "date": "2024-11-18 10:30:00 -0500",
      "message": "feat(types): portfolioStore.tsx type-safe (150 any → 5 acceptable)",
      "changes": "1 file changed, 250 insertions(+), 180 deletions(-)"
    }
  ]
}
```

### 6. `compare_branches` 🆕
Compare two branches to see differences (useful for PR review).

**Example Queries**:
- "Compare main vs feature/mcp-enhancements"
- "Show differences between main and my current branch"
- "What commits are on feature branch but not main?"

**Parameters**:
- `baseBranch` (optional): Base branch to compare against (default: "main")
- `compareBranch` (optional): Branch to compare (default: "HEAD" - current branch)

**Returns**:
```json
{
  "baseBranch": "main",
  "compareBranch": "feature/mcp-enhancements",
  "ahead": 8,
  "behind": 2,
  "uniqueCommits": {
    "onCompare": [
      {
        "hash": "def456...",
        "shortHash": "def456",
        "author": "Eric Socrat",
        "date": "2025-01-15 14:30:00",
        "message": "feat(mcp): add compare_patterns tool"
      }
    ],
    "onBase": [
      {
        "hash": "xyz789...",
        "shortHash": "xyz789",
        "author": "Eric Socrat",
        "date": "2025-01-14 10:00:00",
        "message": "fix: typo in README"
      }
    ]
  },
  "fileChanges": "12 files changed, 850 insertions(+), 120 deletions(-)"
}
```

## Usage Examples

### Example 1: Find Session Work
```
User: "What did we do in Session 75?"
Copilot: [Uses find_session_work with sessionNumber=75]
Response: "Session 75: arg-type elimination patterns. 3 commits found implementing 9 patterns with 100% success rate..."
```

### Example 2: Search Commits
```
User: "Find all testing-related commits"
Copilot: [Uses search_commits with query="testing"]
Response: "Found 23 commits related to testing including AsyncMock pattern (Session 77), Frontend React Testing (Session 79)..."
```

### Example 3: Commit Details
```
User: "Show me what changed in commit abc1234"
Copilot: [Uses get_commit_details]
Response: "Commit abc1234: Added 450 lines across 2 files. Modified test_crypto.py, added patterns.md. Coverage increased 30%..."
```

### Example 4: Sprint Analysis
```
User: "How's progress this month?"
Copilot: [Uses analyze_sprint_progress]
Response: "87 commits in the last month. Peak activity: Oct 27 (18 commits). 5 sessions completed with focus on testing patterns..."
```

## Common Use Cases

### Recover Lost Chat History
Chat history lost after PC reformat? Git commits preserve all context:
- Session work: `find_session_work` with session number
- Topic search: `search_commits` with keywords
- Timeline: `analyze_sprint_progress` for overview

### Project Timeline Understanding
New to the project or returning after break:
- Recent work: `search_commits` with `since="2 weeks ago"`
- Specific feature: Search by keyword (e.g., "authentication", "deployment")
- Development pace: `analyze_sprint_progress` for weekly activity

### Session-Specific Context
AI needs context about specific session work:
- Pattern implementation: Find session commits
- Bug fixes: Search by "fix" + session number
- Feature development: Search by feature name

## Benefits

**For Developers**:
- ✅ Recover lost chat context via git history
- ✅ Understand project evolution and timeline
- ✅ Find session-specific work instantly
- ✅ Analyze development pace and contributions

**For AI Assistants**:
- ✅ Access complete development timeline
- ✅ Understand context from commit messages
- ✅ See full history of changes and decisions
- ✅ Provide data-driven recommendations

## Troubleshooting

**"Git command failed"**:
- Ensure you're in a git repository
- Check git is installed: `git --version`
- Verify repository is initialized

**"No commits found for Session X"**:
- Session number may not be in commit messages
- Try broader search: `search_commits` with "Session X"
- Check recent commits: `analyze_sprint_progress`

**MCP Server not responding**:
1. Restart VS Code (Reload Window)
2. Check Node.js version: `node --version` (≥18.0.0 required)
3. Verify git installed: `git --version`
4. Verify installation: `cd tools && npm list @modelcontextprotocol/sdk`

**Large repository performance**:
- Use `limit` parameter to reduce results
- Narrow search with date filters (`since`, `until`)
- Use specific keywords instead of broad searches

## Git Commit Conventions

For best results with session search:
- Include session number in commit messages: `feat(types): Session 75 - pattern implementation`
- Use conventional commit format: `type(scope): description`
- Add session details in commit body
- Reference related issues/PRs

**Example Good Commit**:
```
feat(testing): Session 77 - AsyncMock pattern implementation

Implemented 157 backend tests using AsyncMock pattern across 6 services:
- DataArchival (26 tests)
- Crypto (42 tests)
- Forex (20 tests)
- Stock (22 tests)
- Indices (28 tests)
- News (19 tests)

Validation:
✅ 100% pass rate
✅ Coverage increased 30-40pp per service
✅ Pattern proven across backend Python

Related: Session 30, 62, 63, 66
```

## Related Documentation

- **Git Workflow**: `/docs/guides/workflow.md`
- **Commit Conventions**: See copilot-instructions.md
- **Session Tracking**: Todo list management in copilot-instructions.md
- **Development Timeline**: Git log is source of truth

## Technical Details

**Implementation**: `tools/mcp-git-history-server.js`
**Data Source**: Git repository (via `git` CLI commands)
**Protocol**: Model Context Protocol (MCP) v1.0
**Dependencies**: `@modelcontextprotocol/sdk`, Node.js `child_process`

**Architecture**:
- Executes `git log` commands via `execSync`
- Parses git output into structured JSON
- Supports all git log filters (author, date, grep)
- 10MB buffer for large commit histories
- Fuzzy session number matching (multiple search patterns)

**Git Commands Used**:
- `git log --all --format=...` - Get commit history
- `git show <hash> --format=... --stat` - Get commit details
- `git diff-tree --no-commit-id --name-status -r <hash>` - Get changed files

**Performance**:
- Searches entire repository history
- 50 commit default limit (configurable)
- <1 second for typical queries
- 10MB buffer handles large codebases
