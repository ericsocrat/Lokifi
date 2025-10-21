# 📡 API Documentation

> **Complete API reference and documentation for Lokifi backend services**

**Last Updated:** October 20, 2025

## 📋 Overview

This folder contains comprehensive documentation for all API endpoints, schemas, authentication methods, and integration patterns used in the Lokifi application.

## 🗂️ Available Documentation

### Core API Documentation

- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Comprehensive API guide with examples and use cases
- **[API_REFERENCE.md](API_REFERENCE.md)** - Technical API reference with all endpoints, parameters, and response schemas

## 🎯 What's in Each File?

### API_DOCUMENTATION.md
**Purpose:** High-level API guide for developers integrating with Lokifi

**Contains:**
- Getting started with the API
- Authentication and authorization flows
- Common use cases and examples
- Best practices and patterns
- Rate limiting and error handling
- Webhooks and real-time features

**Best for:** Understanding API concepts and integration patterns

### API_REFERENCE.md
**Purpose:** Technical reference for all API endpoints

**Contains:**
- Complete endpoint specifications
- Request/response schemas
- HTTP methods and status codes
- Query parameters and filters
- Pagination and sorting
- Example requests and responses

**Best for:** Looking up specific endpoint details during development

## 🚀 Quick Start

### 1. New to the API?
Start with [API_DOCUMENTATION.md](API_DOCUMENTATION.md) to understand:
- How authentication works
- Common API patterns
- Integration examples

### 2. Need Specific Endpoint Details?
Use [API_REFERENCE.md](API_REFERENCE.md) to find:
- Exact endpoint URLs
- Required parameters
- Response formats

### 3. Setting Up?
Check related documentation:
- [../security/ENVIRONMENT_CONFIGURATION.md](../security/ENVIRONMENT_CONFIGURATION.md) - API keys and environment setup
- [../guides/INTEGRATION_TESTS_GUIDE.md](../guides/INTEGRATION_TESTS_GUIDE.md) - Testing API endpoints
- [../QUICK_START.md](../QUICK_START.md) - Backend server setup

## 🔐 Authentication

All API endpoints require authentication. See the authentication section in:
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - Authentication guide
- [../security/ENVIRONMENT_CONFIGURATION.md](../security/ENVIRONMENT_CONFIGURATION.md) - JWT configuration

## 📊 API Endpoints Overview

### Core Resources
- **Authentication** - `/api/v1/auth/*` - User login, registration, token management
- **Users** - `/api/v1/users/*` - User profile and management
- **Accounts** - `/api/v1/accounts/*` - Financial accounts
- **Transactions** - `/api/v1/transactions/*` - Transaction history and management
- **Budgets** - `/api/v1/budgets/*` - Budget creation and tracking
- **Goals** - `/api/v1/goals/*` - Financial goals
- **Categories** - `/api/v1/categories/*` - Transaction categories

For complete endpoint details, see [API_REFERENCE.md](API_REFERENCE.md)

## 🧪 Testing the API

### Using curl
```bash
# Example: Get user profile
curl -X GET http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```bash

### Using Python
```python
import requests
import logging

logger = logging.getLogger(__name__)

# Example: Get user profile
headers = {"Authorization": "Bearer YOUR_TOKEN"}
response = requests.get("http://localhost:8000/api/v1/users/me", headers=headers)
logger.info(f"User profile: {response.json()}")
```python

### Using TypeScript
```typescript
// Example: Get user profile
const response = await fetch('http://localhost:8000/api/v1/users/me', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
});
const data = await response.json();
console.log('User profile:', data);
```typescript

For more testing examples, see [../guides/INTEGRATION_TESTS_GUIDE.md](../guides/INTEGRATION_TESTS_GUIDE.md)

## 🔗 Related Documentation

- **[../guides/DEVELOPER_WORKFLOW.md](../guides/DEVELOPER_WORKFLOW.md)** - Development workflow including API development
- **[../security/ENVIRONMENT_CONFIGURATION.md](../security/ENVIRONMENT_CONFIGURATION.md)** - Environment variables and API configuration
- **[../guides/CODING_STANDARDS.md](../guides/CODING_STANDARDS.md)** - API design standards
- **[../guides/TESTING_GUIDE.md](../guides/TESTING_GUIDE.md)** - API testing guide

## 💡 API Development Guidelines

When adding or modifying API endpoints:

1. **Follow RESTful conventions** - Use proper HTTP methods and status codes
2. **Document all changes** - Update both API_DOCUMENTATION.md and API_REFERENCE.md
3. **Include examples** - Add request/response examples
4. **Version your APIs** - Use `/api/v1/` prefix for versioning
5. **Add tests** - Write integration tests for all endpoints
6. **Update schemas** - Keep Pydantic schemas up to date

## ✅ API Quality Standards

All API documentation should:
- ✅ Include authentication requirements
- ✅ Specify all required and optional parameters
- ✅ Provide example requests and responses
- ✅ Document error cases and status codes
- ✅ Include rate limiting information
- ✅ Be tested and validated

## 📈 API Versioning

Current API version: **v1**

See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for versioning strategy and migration guides.

---

**Need help?** Check the main [../README.md](../README.md) or [../NAVIGATION_GUIDE.md](../NAVIGATION_GUIDE.md) for a complete documentation map.