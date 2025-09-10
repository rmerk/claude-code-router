@echo off
REM Claude Code Router Development Startup Script (Windows)
REM This script starts both the backend API server and the UI development server

echo 🚀 Starting Claude Code Router Development Environment...
echo.

REM Check if required files exist
if not exist "dist\cli.js" (
    echo ❌ Backend CLI not found. Please build the project first:
    echo    npm run build
    goto :error
)

if not exist "ui" (
    echo ❌ UI directory not found
    goto :error
)

echo 🔍 Checking port availability...

REM Start backend server
echo 🔧 Starting Backend API Server...
start /B node dist\cli.js start

timeout /t 3 /nobreak > nul

REM Check if backend is running
netstat -an | find "3456" > nul
if %errorlevel% neq 0 (
    echo ❌ Backend server failed to start
    goto :error
)

REM Start UI development server
echo 🎨 Starting UI Development Server...
cd ui
start /B pnpm dev
cd ..

timeout /t 3 /nobreak > nul

REM Check if UI is running
netstat -an | find "5173" > nul
if %errorlevel% neq 0 (
    echo ❌ UI server failed to start
    goto :error
)

echo.
echo 🎉 Both servers started successfully!
echo.
echo 🌐 UI Server:        http://localhost:5173/
echo 🔗 Backend API:      http://localhost:3456/
echo.
echo 🛑 To stop both servers:
echo    taskkill /F /IM node.exe
echo.
echo 📝 Press Ctrl+C in the command prompt to stop this script

REM Keep the script running
pause
goto :eof

:error
echo.
echo ❌ Failed to start development environment
pause
exit /b 1
