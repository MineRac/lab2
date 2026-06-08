@echo off
chcp 65001 >nul
echo.
echo [ML] Installing lightweight ML service dependencies...
echo.

cd /d "%~dp0ml"

if not exist ".venv\Scripts\python.exe" (
  echo [ML] Creating virtual environment...
  python -m venv .venv
)

".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\python.exe" -m pip install -r requirements_service.txt

echo.
echo [ML] Service dependencies installed.
echo.
pause
