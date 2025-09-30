@echo off
REM Fynix Automated Backup Script
REM Created: 2025-09-29 16:28:42.805666

set BACKUP_DIR=backups
set DATE=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set DATE=%DATE: =0%

echo Starting backup at %date% %time%

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Database backup
if exist "backend\fynix.sqlite" (
    echo Backing up database...
    copy "backend\fynix.sqlite" "%BACKUP_DIR%\fynix_%DATE%.sqlite"
    echo Database backup completed
)

REM Configuration backup
echo Backing up configurations...
if exist ".env.production" copy ".env.production" "%BACKUP_DIR%\env_prod_%DATE%.txt"
if exist "docker-compose.production.yml" copy "docker-compose.production.yml" "%BACKUP_DIR%\compose_prod_%DATE%.yml"

echo Backup completed at %date% %time%
