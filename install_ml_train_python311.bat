@echo off
chcp 65001 >nul
echo.
echo [ML TRAIN] Installing heavy training dependencies.
echo [ML TRAIN] Recommended: Python 3.11.
echo.

cd /d "%~dp0ml"

where py >nul 2>nul
if %errorlevel%==0 (
  py -3.11 -m venv .venv
) else (
  python -m venv .venv
)

".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\python.exe" -m pip install -r requirements_train.txt

echo.
echo [ML TRAIN] Training dependencies installed.
echo.
pause
