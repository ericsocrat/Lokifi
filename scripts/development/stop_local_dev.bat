@echo off
REM Stop all local development services
echo Stopping Lokifi Local Development Environment...

REM Stop Docker containers
docker stop lokifi-redis-dev 2>nul
docker rm lokifi-redis-dev 2>nul

REM Kill processes on development ports
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000"') do taskkill /f /pid %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000"') do taskkill /f /pid %%a 2>nul

echo Local development environment stopped.
pause
