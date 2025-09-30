# Fynix Local Development Guide
Generated: 2025-09-29 16:39:36

## Quick Start

### 1. Environment Setup
```bash
# Navigate to project
cd C:\Users\USER\Desktop\fynix

# Start local development
dev_scripts\start_local_dev.bat
```

### 2. Access Points
- **Backend API**: http://localhost:8000
- **Frontend**: http://localhost:3000 (if available)
- **API Documentation**: http://localhost:8000/docs
- **Database**: SQLite file at backend/fynix.sqlite

### 3. Development Tools

#### Local Testing
```bash
# Run comprehensive tests
python local_tools\local_test_runner.py

# Quick tests
dev_scripts\quick_test.bat

# Code quality analysis
python local_tools\code_quality_analyzer.py
```

#### System Monitoring
```bash
# One-time check
python local_tools\local_system_monitor.py --once

# Continuous monitoring
python local_tools\local_system_monitor.py --interval 10
```

#### Database Management
```bash
# Reset database
dev_scripts\reset_database.bat

# Database management suite
cd backend
python database_management_suite.py
```

### 4. Project Structure
```
fynix/
├── backend/                 # Python FastAPI backend
│   ├── app/                # Application code
│   │   ├── main.py        # Main application
│   │   ├── models/        # Database models
│   │   ├── routers/       # API routes
│   │   └── services/      # Business logic
│   ├── .venv/             # Virtual environment
│   ├── fynix.sqlite       # SQLite database
│   └── requirements.txt   # Python dependencies
├── frontend/               # Next.js frontend (if available)
├── local_tools/           # Local development tools
├── dev_scripts/           # Development automation scripts
├── test_results/          # Test and analysis results
├── monitoring/            # Monitoring configurations
└── ssl/                   # SSL certificate configs

```

### 5. Common Tasks

#### Starting Development
1. Open VS Code in project directory
2. Open integrated terminal
3. Run: `dev_scripts\start_local_dev.bat`
4. Access backend at http://localhost:8000

#### Running Tests
1. Quick validation: `dev_scripts\quick_test.bat`
2. Comprehensive testing: `python local_tools\local_test_runner.py`
3. Code quality check: `python local_tools\code_quality_analyzer.py`

#### Database Operations
1. View data: Connect to `backend/fynix.sqlite` with SQLite browser
2. Reset database: `dev_scripts\reset_database.bat`
3. Backup database: Files are automatically backed up to `backups/`

#### Monitoring Performance
1. Real-time monitoring: `python local_tools\local_system_monitor.py`
2. Check service status: Look for 🟢/🔴 indicators
3. View metrics: Check `local_metrics.log`

### 6. VS Code Integration

#### Debugging
- Use F5 to start debugging
- Available configurations:
  - FastAPI application
  - Current Python file
  - Database tests

#### Extensions Recommended
- Python
- SQLite Viewer
- Thunder Client (API testing)
- GitLens
- Prettier

### 7. Troubleshooting

#### Server Won't Start
1. Check if port 8000 is in use: `netstat -an | findstr 8000`
2. Verify Python path: Should be `C:\Users\USER\Desktop\fynix\backend`
3. Check dependencies: All should be in `.venv/Lib/site-packages/`

#### Import Errors
1. Ensure PYTHONPATH is set: `$env:PYTHONPATH = "C:\Users\USER\Desktop\fynix\backend"`
2. Verify virtual environment is activated
3. Check if all dependencies are installed

#### Database Issues
1. Check if `fynix.sqlite` exists in `backend/` directory
2. Reset database: `dev_scripts\reset_database.bat`
3. Run database management suite for diagnosis

### 8. Performance Optimization

#### Local Development
- Use SQLite for development (already configured)
- Enable hot reload with uvicorn --reload
- Monitor system resources with local monitor

#### Testing
- Run tests frequently with local test runner
- Check code quality regularly
- Monitor performance metrics

### 9. Security Considerations (Local)
- Environment variables are in `.env` file
- Database is local SQLite file
- No external network access required for basic development
- SSL configuration available for production deployment

### 10. Next Steps
When ready for production:
1. Follow `IMMEDIATE_ACTIONS_COMPLETE.md`
2. Set up domain and server
3. Deploy using `docker-compose.production.yml`
4. Configure SSL certificates
5. Set up monitoring with Prometheus/Grafana

---

## Support
- Check logs in `local_development_enhancement.log`
- Test results in `test_results/` directory
- Code quality reports generated automatically
- System metrics logged to `local_metrics.log`

Happy coding! 🚀
