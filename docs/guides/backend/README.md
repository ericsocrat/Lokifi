# Backend Development Guide

> FastAPI, PostgreSQL, Redis, and backend-specific documentation.

## 📂 Directory Structure

```
backend/
├── fastapi/            # FastAPI patterns and best practices
│   └── .gitkeep
├── database/           # Database setup and management
│   ├── POSTGRESQL_SETUP.md
│   ├── REDIS_SETUP.md
│   └── .gitkeep
└── services/           # Service layer patterns
    └── .gitkeep
```

## 🎯 What's Here

### FastAPI (Future)
- Route patterns and organization
- Dependency injection patterns
- Authentication and authorization
- WebSocket implementation
- Background tasks and async operations

### Database
- **PostgreSQL**: Setup, migrations, query optimization
- **Redis**: Caching strategies, session management
- SQLAlchemy ORM patterns
- Database migrations with Alembic
- Query performance monitoring

### Services (Future)
- Service layer architecture
- Business logic organization
- External API integrations
- Error handling and logging
- Testing service layer

## 🚀 Tech Stack

- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with SQLAlchemy
- **Cache**: Redis
- **Testing**: Pytest with coverage
- **Validation**: Pydantic models

## 📚 Related Documentation

- **Testing**: [../testing/INTEGRATION_TESTS_GUIDE.md](../testing/INTEGRATION_TESTS_GUIDE.md)
- **Code Quality**: [../quality/CODING_STANDARDS.md](../quality/CODING_STANDARDS.md)
- **Security**: [../../security/BACKEND_SECURITY_AUDIT_2025-01-30.md](../../security/BACKEND_SECURITY_AUDIT_2025-01-30.md)

---

**See also:** [Frontend Guide](../frontend/README.md) | [API Documentation](../../api/README.md)
