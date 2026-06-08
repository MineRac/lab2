@echo off
chcp 65001 >nul
echo.
echo [ML] Starting ML service on http://127.0.0.1:8001
echo.

cd /d "%~dp0ml"

if not exist ".venv\Scripts\python.exe" (
  echo [ERROR] Virtual environment not found.
  echo Run setup_ml_service.bat first.
  pause
  exit /b 1
)

".venv\Scripts\python.exe" -m uvicorn ml_service:app --host 127.0.0.1 --port 8001
pause
