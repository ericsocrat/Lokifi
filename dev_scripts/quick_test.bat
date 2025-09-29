@echo off
REM Quick local testing script
echo Running Fynix Quick Tests...

cd backend

REM Database tests
echo Testing database...
.venv\Scripts\python.exe database_management_suite.py || echo "Database test failed"

REM Import tests
echo Testing imports...
.venv\Scripts\python.exe -c "from app.main import app; print('✓ Main app imports OK')" || echo "Import test failed"

REM Performance check
echo Running performance check...
.venv\Scripts\python.exe performance_monitor.py --once || echo "Performance check failed"

echo Quick tests completed!
pause
