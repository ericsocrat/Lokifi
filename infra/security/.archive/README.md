# Archived: infra/security/configs/

**Archived Date**: October 31, 2025
**Reason**: Directory structure cleanup - removed redundant configuration storage

## Why This Directory Was Archived

The `configs/` directory in `infra/security/` was creating confusion by duplicating environment configuration files that should be managed in their application-specific locations.

### Issues Identified:

1. **Redundancy**: Environment files existed in 3 locations:
   - `infra/security/configs/.env.example` (137 lines)
   - `infra/docker/.env.example` (60 lines)
   - `.env.example` at project root (144 lines)

2. **Violated "Config Near Code" Principle**:
   - Backend configs should be in `apps/backend/` (near the code)
   - Docker configs correctly in `infra/docker/` ✅
   - API keys correctly at project root ✅

3. **Unclear Purpose**:
   - `infra/security/` should focus on security **tools and auditing**
   - Not for storing application configuration templates

### Correct Structure (After Cleanup):

```
Environment Configuration Locations:
├── apps/backend/.env.example          # Backend app config (JWT, database)
├── infra/docker/.env.example          # Docker services (Redis, PostgreSQL)
└── .env.example (root)                # API keys for external services

Security Directory Focus:
├── infra/security/audit-tools/        # Security scanning scripts ✅
├── infra/security/dependency_protection/  # NPM/pip protection ✅
└── infra/security/DEPENDENCY_PROTECTION_GUIDE.md  # Documentation ✅
```

### Migration Path:

**No Migration Needed** - The files in this archived directory were templates/examples that already existed in their correct locations:
- Backend configs → Already in `apps/backend/`
- Docker configs → Already in `infra/docker/`
- API keys → Already at project root

### Documentation Updated:

- `infra/security/README.md` - Updated with cross-references to correct locations
- `docs/security/environment.md` - Added cross-references to security tools
- All documentation now points to the single source of truth for each config type

### Reference:

If you need to reference the old templates, they are preserved in this archive directory:
- `.env.development` (2268 bytes)
- `.env.example` (3842 bytes)
- `.env.security.template` (2533 bytes)

**Note**: These files are kept for historical reference only. Use the application-specific `.env.example` files in their correct locations.

---

**Related Commits**:
- See commit history for "refactor(security): remove redundant configs directory"
