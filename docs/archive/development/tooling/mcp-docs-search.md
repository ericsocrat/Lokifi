# Lokifi Documentation Search MCP Server

**Status**: ✅ Production Ready
**Purpose**: Intelligent search across all project documentation folders

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
    "lokifi-docs": {
      "command": "node",
      "args": ["${workspaceFolder}/tools/mcp-docs-search-server.js"]
    }
  }
}
```

### 3. Restart VS Code

Reload VS Code to activate the MCP server.

### 4. Test the Server

Ask Copilot:
- "Search docs for deployment guides"
- "Show me the testing documentation"
- "Find security checklists"
- "What documentation exists for CI/CD?"

## Available Tools

### 1. `search_docs`
Search across all documentation files by keyword.

**Example Queries**:
- "Search for deployment guides"
- "Find testing patterns documentation"
- "Look for CI/CD workflows"

**Parameters**:
- `query` (required): Search keyword or topic
- `category` (optional): Filter by category (e.g., "guides", "testing", "deployment")

**Returns**:
```json
{
  "query": "deployment",
  "category": "all",
  "totalFiles": 85,
  "resultsCount": 12,
  "results": [
    {
      "file": "deployment/production.md",
      "title": "Production Deployment Guide",
      "category": "deployment",
      "matchCount": 8,
      "matches": [
        {
          "lineNumber": 42,
          "line": "## Deployment Process",
          "context": "...\n## Deployment Process\n..."
        }
      ],
      "path": "c:\\...\\docs\\deployment\\production.md"
    }
  ]
}
```

### 2. `get_doc_content`
Get full content of a specific documentation file.

**Example Queries**:
- "Show me the workflow.md file"
- "Get content of testing guide"
- "Read the deployment checklist"

**Parameters**:
- `filePath` (required): Full or partial file path (supports fuzzy matching)

**Returns**:
```json
{
  "file": "guides/workflow.md",
  "category": "guides",
  "headings": [
    { "level": 1, "text": "Development Workflow" },
    { "level": 2, "text": "Setup" },
    { "level": 2, "text": "Daily Development" }
  ],
  "lineCount": 450,
  "content": "# Development Workflow\n\n...",
  "path": "c:\\...\\docs\\guides\\workflow.md"
}
```

### 3. `list_docs_by_category`
List all documentation files organized by category.

**Example Queries**:
- "List all documentation files"
- "Show me testing docs"
- "What deployment guides exist?"

**Parameters**:
- `category` (optional): Filter by specific category

**Returns**:
```json
{
  "categories": [
    {
      "name": "guides",
      "fileCount": 12,
      "files": [
        { "name": "workflow.md", "path": "guides/workflow.md" },
        { "name": "standards.md", "path": "guides/standards.md" }
      ]
    },
    {
      "name": "testing",
      "fileCount": 8,
      "files": [
        { "name": "overview.md", "path": "testing/overview.md" }
      ]
    }
  ],
  "totalCategories": 12,
  "totalFiles": 85
}
```

### 4. `search_checklists`
Search checklists.md for process workflows.

**Example Queries**:
- "Find pre-commit checklist"
- "Show deployment procedures"
- "Security implementation checklist"

**Parameters**:
- `query` (optional): Search keyword (searches all checklists if omitted)

**Returns**:
```json
{
  "query": "pre-commit",
  "totalSections": 15,
  "matchingChecklists": 2,
  "checklists": [
    {
      "title": "Pre-Commit Quality Gates",
      "content": "- [ ] TypeScript typecheck passes\n- [ ] ESLint passes\n...",
      "itemCount": 8
    }
  ]
}
```

### 5. `get_recent_docs` 🆕
Find documentation files modified in the last N days.

**Example Queries**:
- "What docs changed in the last 7 days?"
- "Show recent documentation updates"
- "Find recently modified testing docs"

**Parameters**:
- `days` (optional): Number of days to look back (default: 30)
- `category` (optional): Filter by category (e.g., "testing", "guides")

**Returns**:
```json
{
  "days": 7,
  "category": null,
  "count": 5,
  "recentDocs": [
    {
      "file": "development/tooling/mcp-coverage-server.md",
      "category": "development",
      "modifiedDate": "2025-01-15T10:30:00.000Z",
      "daysAgo": 2,
      "path": "c:\\...\\docs\\development\\tooling\\mcp-coverage-server.md"
    }
  ]
}
```

### 6. `find_related_docs` 🆕
Discover documentation related to a specific file.

**Example Queries**:
- "Find docs related to mcp-coverage-server.md"
- "What other testing guides are related to overview.md?"
- "Show related deployment documentation"

**Parameters**:
- `filePath` (required): File path or name to find related docs for
- `maxResults` (optional): Number of related docs to return (default: 10)

**Returns**:
```json
{
  "sourceFile": "development/tooling/mcp-coverage-server.md",
  "count": 8,
  "relatedDocs": [
    {
      "file": "testing/overview.md",
      "category": "testing",
      "relevanceScore": 85,
      "reason": "Same category + 5 cross-links + keyword matches: coverage, testing, vitest",
      "path": "c:\\...\\docs\\testing\\overview.md"
    },
    {
      "file": "development/tooling/mcp-pattern-library.md",
      "category": "development",
      "relevanceScore": 72,
      "reason": "Cross-links + keyword matches: mcp, tooling",
      "path": "c:\\...\\docs\\development\\tooling\\mcp-pattern-library.md"
    }
  ]
}
```

## Usage Examples

### Example 1: Find Deployment Guides
```
User: "How do I deploy to production?"
Copilot: [Uses search_docs with query="deployment production"]
Response: "Found 3 deployment guides: production.md (full stack), dns.md (domain setup), docker deployment..."
```

### Example 2: Read Specific Guide
```
User: "Show me the testing guide"
Copilot: [Uses get_doc_content with filePath="testing/overview.md"]
Response: "Testing guide with sections on: Vitest setup, Pytest configuration, coverage thresholds, best practices..."
```

### Example 3: Browse Category
```
User: "What CI/CD documentation exists?"
Copilot: [Uses list_docs_by_category with category="ci-cd"]
Response: "CI/CD category contains 5 files: overview.md, optimization.md, dependencies/renovate-evaluation.md..."
```

### Example 4: Find Checklist
```
User: "What's the pre-merge checklist?"
Copilot: [Uses search_checklists with query="pre-merge"]
Response: "Pre-Merge Checklist: [ ] All tests pass, [ ] Coverage meets threshold, [ ] Documentation updated..."
```

## Documentation Categories

The server searches across these categories:
1. **guides** - Development guides and workflows
2. **testing** - Testing patterns and best practices
3. **deployment** - Production deployment guides
4. **ci-cd** - CI/CD pipeline documentation
5. **development** - Development tooling and processes
6. **security** - Security best practices and audits
7. **architecture** - System architecture and design
8. **api** - API documentation
9. **monitoring** - Monitoring and observability
10. **processes** - Team processes and workflows
11. **troubleshooting** - Common issues and solutions
12. **plans** - Project plans and roadmaps

## Benefits

**For Developers**:
- ✅ Instant search across 85+ documentation files
- ✅ Find guides without browsing folder structure
- ✅ Quick access to checklists and procedures
- ✅ Context snippets show relevant sections

**For AI Assistants**:
- ✅ Comprehensive project knowledge access
- ✅ Documentation-backed recommendations
- ✅ Process workflow automation
- ✅ Searchable by topic or category

## Troubleshooting

**"File not found"**:
- Use `search_docs` first to find exact path
- Partial paths work (e.g., "workflow" matches "guides/workflow.md")
- Check `list_docs_by_category` to see all files

**"No results found"**:
- Try broader search terms
- Check spelling of keywords
- Use category filter to narrow search

**MCP Server not responding**:
1. Restart VS Code (Reload Window)
2. Check Node.js version: `node --version` (≥18.0.0 required)
3. Verify installation: `cd tools && npm list @modelcontextprotocol/sdk`

**Search too slow**:
- Use category filter to reduce search scope
- Be more specific with search keywords
- Large files may take longer to search

## Related Documentation

- **Documentation Index**: `/docs/README.md`
- **Checklists**: `/docs/checklists.md` (all standard procedures)
- **Quick Start**: `/docs/quick-start.md`
- **Deployment Guides**: `/docs/deployment/`
- **Testing Guides**: `/docs/guides/testing/`

## Technical Details

**Implementation**: `tools/mcp-docs-search-server.js`
**Data Source**: `/docs/` directory (all .md files)
**Protocol**: Model Context Protocol (MCP) v1.0
**Dependencies**: `@modelcontextprotocol/sdk`

**Architecture**:
- Recursively scans `/docs/` for all .md files
- Indexes content with line-by-line search
- Returns context snippets (2 lines before/after match)
- Supports fuzzy path matching for file retrieval
- Special handling for `checklists.md` (section-based search)

**Performance**:
- Indexes ~85 documentation files
- Search completes in <1 second
- Returns top 20 most relevant results
- Context snippets limited to 5 per file
