@echo off
chcp 65001 >nul
echo.
echo [APP] Starting ML service, backend and frontend...
echo.

cd /d "%~dp0"

if not exist "ml\.venv\Scripts\python.exe" (
  echo [ERROR] ML virtual environment not found.
  echo Run setup_ml_service.bat first.
  pause
  exit /b 1
)

npx concurrently "npm run ml:win" "npm run dev:server" "npm run dev"
pause
