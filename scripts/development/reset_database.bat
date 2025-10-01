@echo off
REM Reset local database to clean state
echo Resetting Lokifi Local Database...

cd backend

REM Backup current database
if exist "lokifi.sqlite" (
    echo Creating backup...
    copy lokifi.sqlite "fynix_backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%.sqlite"
)

REM Reset database
echo Resetting database...
.venv\Scripts\python.exe manage_db.py reset || echo "Database reset failed"

REM Apply indexes
echo Applying performance indexes...
.venv\Scripts\python.exe apply_database_indexes.py || echo "Index application failed"

echo Database reset completed!
pause
