# Lokifi Pattern Library MCP Server

**Status**: ✅ Production Ready
**Purpose**: Provides instant access to 48+ battle-tested patterns from 91+ development sessions

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
    "lokifi-patterns": {
      "command": "node",
      "args": ["${workspaceFolder}/tools/mcp-pattern-library-server.js"]
    }
  }
}
```

### 3. Restart VS Code

Reload VS Code to activate the MCP server.

### 4. Test the Server

Ask Copilot:
- "Show me the AsyncMock pattern"
- "What testing patterns are available?"
- "Search for TypeScript type safety patterns"
- "What are the highest priority patterns?"

## Available Tools

### 1. `search_patterns`
Search for patterns by keyword or category.

**Example Queries**:
- "Search for AsyncMock patterns"
- "Show testing patterns"
- "Find TypeScript any elimination patterns"

**Parameters**:
- `query` (optional): Search keyword (e.g., "AsyncMock", "TypeScript", "testing")
- `category` (optional): Filter by category (e.g., "Testing", "Code Quality", "CI/CD")

**Returns**:
```json
{
  "query": "AsyncMock",
  "category": null,
  "count": 1,
  "patterns": [
    {
      "name": "AsyncMock Pattern",
      "description": "100% success, 182 tests proven...",
      "success": "100%",
      "sessions": "30, 62, 63, 66, 77 Phases 1-6, 79",
      "priority": 3
    }
  ]
}
```

### 2. `get_pattern_details`
Get detailed information about a specific pattern.

**Example Queries**:
- "Show me details for AsyncMock Pattern"
- "What's in the Zustand + Immer pattern?"
- "Get TypeScript Any Elimination pattern details"

**Parameters**:
- `patternName` (required): Name of the pattern (fuzzy matching supported)

**Returns**:
```json
{
  "name": "AsyncMock Pattern",
  "description": "100% success, 182 tests proven...",
  "details": [
    "create_mock_response() helper: Lambda pattern...",
    "Success Rate: 100% across backend Python + frontend React TypeScript",
    "Backend Validation (157 tests): 26 DataArchival + 42 Crypto...",
    "Complete Guides: /docs/guides/testing/..."
  ],
  "codeExamples": [
    "```python\n# Example code\n```"
  ],
  "documentation": "/docs/guides/testing/external-api-testing-patterns.md",
  "fullText": "Full pattern text..."
}
```

### 3. `list_categories`
List all pattern categories with counts.

**Example Queries**:
- "What pattern categories exist?"
- "Show me all categories"
- "How many patterns are there?"

**Returns**:
```json
{
  "categories": [
    { "name": "Testing", "count": 12 },
    { "name": "Code Quality", "count": 11 },
    { "name": "CI/CD", "count": 4 },
    { "name": "Type Safety - arg-type Elimination", "count": 9 },
    { "name": "Type Safety - attr-defined Elimination", "count": 4 },
    { "name": "Dependencies", "count": 4 },
    { "name": "Python", "count": 3 },
    { "name": "Debugging", "count": 2 }
  ],
  "totalCategories": 8,
  "totalPatterns": 48,
  "totalSessions": "91+",
  "summary": "48 patterns across 8 categories from 91+ sessions"
}
```

### 4. `get_success_metrics`
Get overall success metrics and top patterns.

**Example Queries**:
- "What are the success metrics for patterns?"
- "Show me top-performing patterns"
- "Pattern library statistics"

**Returns**:
```json
{
  "totalPatterns": 48,
  "totalCategories": 8,
  "patternsWithMetrics": 35,
  "priorityBreakdown": {
    "high": 15,
    "medium": 10,
    "low": 8,
    "none": 15
  },
  "topPatterns": [
    {
      "name": "AsyncMock Pattern",
      "priority": "⭐⭐⭐",
      "success": "100%"
    }
  ],
  "overallMetrics": "96% average success rate, 500+ percentage points coverage gained, 100+ hours saved"
}
```

### 5. `compare_patterns` 🆕
Compare 2 or more patterns side-by-side.

**Example Queries**:
- "Compare AsyncMock vs Pure Functions"
- "Show me differences between TypeScript Any Elimination and Cascading Type Fixes"
- "Compare testing patterns: AsyncMock, Mathematical Indicator, Frontend React Testing"

**Parameters**:
- `patternNames` (required): Array of 2+ pattern names

**Returns**:
```json
{
  "comparison": [
    {
      "name": "AsyncMock Pattern",
      "problem": "Testing external API calls without actual network requests",
      "solution": "create_mock_response() helper with lambda pattern",
      "whenToUse": "Backend/frontend testing, API mocking, isolated unit tests",
      "useCase": "182 tests across DataArchival, Crypto, CryptoPanic, FMP, NewsAPI"
    },
    {
      "name": "Pure Functions Pattern",
      "problem": "Complex logic tangled with state management",
      "solution": "Extract calculations to pure functions with proper types",
      "whenToUse": "Mathematical computations, data transformations, testable logic"
    }
  ]
}
```

### 6. `get_pattern_recommendations` 🆕
Get AI-powered pattern recommendations based on your problem.

**Example Queries**:
- "Recommend patterns for API testing"
- "What patterns help with type safety?"
- "Suggest patterns for performance optimization"

**Parameters**:
- `problemDescription` (required): Description of your problem
- `maxResults` (optional): Number of recommendations (default: 5)

**Returns**:
```json
{
  "query": "API testing",
  "recommendations": [
    {
      "name": "AsyncMock Pattern",
      "relevanceScore": 95,
      "priority": "⭐⭐⭐",
      "success": "100%",
      "reason": "High relevance for API testing, proven success across 182 tests"
    },
    {
      "name": "External API Testing Pattern",
      "relevanceScore": 88,
      "priority": "⭐⭐⭐",
      "success": "88%",
      "reason": "Specialized for external API testing with comprehensive examples"
    }
  ]
}
```
    "none": 15
  },
  "topPatterns": [
    {
      "name": "AsyncMock Pattern",
      "priority": "⭐⭐⭐",
      "success": "100%"
    }
  ],
  "overallMetrics": "96% average success rate, 500+ percentage points coverage gained, 100+ hours saved"
}
```

## Usage Examples

### Example 1: Find Testing Patterns
```
User: "What testing patterns are proven?"
Copilot: [Uses search_patterns with category="Testing"]
Response: "Found 12 testing patterns including AsyncMock Pattern (100% success, 182 tests), Mathematical Indicator Testing (9/9 proven), Frontend React Testing (88.84% coverage)..."
```

### Example 2: Get Specific Pattern
```
User: "Show me the Zustand + Immer pattern"
Copilot: [Uses get_pattern_details]
Response: "Pattern details with code examples, Draft<T> usage, 100% success rate across 10 stores..."
```

### Example 3: Browse Categories
```
User: "What categories of patterns exist?"
Copilot: [Uses list_categories]
Response: "8 categories: Testing (12), Code Quality (11), CI/CD (4), Type Safety (13), Dependencies (4), Python (3), Debugging (2), UI/UX (1)"
```

### Example 4: Success Metrics
```
User: "What are the highest priority patterns?"
Copilot: [Uses get_success_metrics]
Response: "15 high-priority patterns including AsyncMock (⭐⭐⭐), Mathematical Indicator Testing (⭐⭐⭐), React Keyboard Shortcuts (⭐⭐⭐)..."
```

## Pattern Categories

1. **Testing Patterns** (12) - AsyncMock, Mathematical Indicators, Frontend React Testing, etc.
2. **UI/UX Patterns** (1) - React Keyboard Shortcuts
3. **CI/CD Patterns** (4) - Workflow Health Check, GitHub CLI Investigation, Service Config Standards
4. **Code Quality Patterns** (11) - Assignment Errors, Cascading Type Fixes, TypeScript Any Elimination
5. **Type Safety - arg-type Elimination** (9) - Type Narrowing, Union Types, Protocol-Based Typing
6. **Type Safety - attr-defined Elimination** (4) - Type Narrowing, Cascading Auto-Resolution
7. **Dependencies Patterns** (4) - Conflict Resolution, Pin vs Replace, Renovate Migration
8. **Python Patterns** (3) - Python 3.10 Compatibility, UTC Import Pattern
9. **Debugging Patterns** (2) - Root Cause Analysis, Log Analysis

## Benefits

**For Developers**:
- ✅ Instant access to 48+ proven solutions
- ✅ Avoid reinventing solved problems
- ✅ Learn from 91+ sessions of development experience
- ✅ Find patterns by keyword or category

**For AI Assistants**:
- ✅ Context-aware pattern recommendations
- ✅ Complete code examples and documentation links
- ✅ Success metrics and priority rankings
- ✅ Searchable by problem domain

## Troubleshooting

**"Pattern not found"**:
- Use fuzzy search - partial name matching works
- Try `search_patterns` first to find exact name
- Check `list_categories` to see all available patterns

**MCP Server not responding**:
1. Restart VS Code (Reload Window)
2. Check Node.js version: `node --version` (≥18.0.0 required)
3. Verify installation: `cd tools && npm list @modelcontextprotocol/sdk`

**Pattern Library section not found**:
- Ensure `.github/copilot-instructions.md` exists
- Pattern Library section starts with `## 📚 Pattern Library`

## Related Documentation

- **Pattern Library Source**: `.github/copilot-instructions.md` (lines 1550+)
- **Complete Testing Patterns**: `/docs/guides/testing/frontend-testing-patterns.md`
- **Backend Testing Patterns**: `/docs/guides/testing/external-api-testing-patterns.md`
- **Type Safety Guides**: `/docs/development/type-safety/`

## Technical Details

**Implementation**: `tools/mcp-pattern-library-server.js`
**Data Source**: `.github/copilot-instructions.md` (Pattern Library section)
**Protocol**: Model Context Protocol (MCP) v1.0
**Dependencies**: `@modelcontextprotocol/sdk`

**Architecture**:
- Parses Pattern Library section from copilot-instructions.md
- Extracts pattern metadata (name, description, success metrics, sessions)
- Provides fuzzy search across pattern names and descriptions
- Returns full pattern text including code examples and documentation links
