# Development Documentation

> Developer experience, workflows, tooling, and best practices.

## 📂 Directory Structure

```
development/
├── setup/                  # Development environment setup
│   └── DEVELOPER_WORKFLOW.md  # Complete developer workflow guide
├── tooling/                # Tools and automation guides
│   ├── coverage-dashboard-integration.md  # Live coverage dashboard (238 lines)
│   ├── coverage-dashboard-quick-ref.md    # Quick reference (108 lines)
│   ├── copilot-usage.md                   # GitHub Copilot shortcuts (186 lines)
│   └── mcp-coverage-server.md             # MCP coverage server (272 lines)
├── type-safety/            # Type safety patterns and guides
│   └── cascading-type-fixes.md            # Cascading type fix patterns
└── practices/              # Development best practices
    └── .gitkeep
```

## 📚 Quick Links

- **Get Started**: [DEVELOPER_WORKFLOW.md](setup/DEVELOPER_WORKFLOW.md)
- **Checklists**: [CHECKLISTS.md](../checklists.md)
- **Quick Start**: [QUICK_START.md](../quick-start.md)

## 🎯 What's Here

### Setup
- Complete development environment setup
- Daily developer workflows
- IDE configuration and extensions
- Local development with Docker

### Tooling
- **Coverage Dashboard**: Live test coverage metrics at http://localhost:3002
  - [Integration Guide](tooling/coverage-dashboard-integration.md) - Complete setup and features
  - [Quick Reference](tooling/coverage-dashboard-quick-ref.md) - One-page cheat sheet
- **GitHub Copilot**: AI-powered code completion and chat
  - [Usage Guide](tooling/copilot-usage.md) - Shortcuts, prompts, best practices
- **MCP Coverage Server**: Real-time coverage data access
  - [MCP Server Guide](tooling/mcp-coverage-server.md) - Model Context Protocol integration
- Build tools and automation
- Testing frameworks and runners
- Code quality tools (ESLint, Prettier, etc.)
- CI/CD integration and local testing

### Type Safety
- **Cascading Type Fixes**: Type error resolution patterns
  - [Cascading Patterns](type-safety/cascading-type-fixes.md) - 52.8% error reduction (Session 73)
- Type narrowing and inference patterns
- MyPy configuration and best practices
- TypeScript strict mode guidelines

### Practices (Future)
- Code review guidelines
- Git workflow and branching strategy
- Documentation standards
- Performance profiling and debugging

---

**See also:** [Testing Guide](../guides/testing/TESTING_GUIDE.md) | [Code Quality](../guides/quality/CODE_QUALITY.md)
