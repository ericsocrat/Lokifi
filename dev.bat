@echo off
REM Fynix Development Helper (Batch)
REM Usage: dev.bat [command]

if "%~1"=="" goto help
if "%~1"=="help" goto help
if "%~1"=="start" goto start
if "%~1"=="dev" goto dev
if "%~1"=="be" goto backend
if "%~1"=="fe" goto frontend
if "%~1"=="test" goto test
if "%~1"=="setup" goto setup
if "%~1"=="clean" goto clean
goto unknown

:help
echo.
echo 🚀 Fynix Development Commands (Batch)
echo ====================================
echo.
echo Quick Commands:
echo   dev start     - Setup and start everything
echo   dev dev       - Start development servers
echo   dev be        - Backend only (FastAPI)
echo   dev fe        - Frontend only (Next.js)
echo   dev test      - Run tests
echo   dev setup     - Setup environments
echo   dev clean     - Clean cache
echo.
echo For more commands, use: make help
echo.
goto end

:start
echo 🚀 Starting Fynix full-stack...
call make start
goto end

:dev
echo 🔥 Starting development servers...
call make dev
goto end

:backend
echo 🔧 Starting backend...
call make be
goto end

:frontend
echo 🌐 Starting frontend...
call make fe
goto end

:test
echo 🧪 Running tests...
call make test
goto end

:setup
echo 📦 Setting up environment...
call make setup
goto end

:clean
echo 🧹 Cleaning cache...
call make clean
goto end

:unknown
echo Unknown command: %~1
echo Use "dev help" for available commands
goto end

:end