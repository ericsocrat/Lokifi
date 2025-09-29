# Fynix Testing Configuration

## Running Tests Locally

### Backend Tests
cd backend
python database_management_suite.py
python advanced_testing_framework.py --local-mode

### Performance Tests  
cd backend
python performance_optimization_suite.py --quick-test

## CI/CD Integration
- GitHub Actions: .github/workflows/ci_cd.yml
- Automated testing on push/PR
- Security scanning with safety and bandit
- Docker image building on main branch

## Test Environment Setup
1. Ensure all dependencies installed: pip install -r requirements.txt
2. Database setup: python manage_db.py init
3. Run tests: python -m pytest

## Test Coverage
- Unit tests for core functionality
- Integration tests for API endpoints
- Performance benchmarks
- Security vulnerability scanning
