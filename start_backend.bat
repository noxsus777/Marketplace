@echo off
title Premium Sphere — Backend
echo =============================================
echo  Premium Sphere Backend Setup
echo =============================================
echo.

cd /d "%~dp0backend"

:: Check if virtual environment exists
if not exist ".venv" (
    echo [1/3] Creating Python virtual environment...
    python -m venv .venv
    echo      Done.
) else (
    echo [1/3] Virtual environment already exists. Skipping.
)

echo.
echo [2/3] Installing dependencies...
call .venv\Scripts\activate.bat
pip install -r requirements_local.txt --quiet
echo      Done.

echo.
echo [3/3] Starting FastAPI server on http://localhost:8000 ...
echo.
echo  Admin login:
echo    Email:    admin@premiumsphere.com
echo    Password: Admin@123
echo.
echo  API docs: http://localhost:8000/docs
echo  Press Ctrl+C to stop.
echo.
call .venv\Scripts\uvicorn.exe server:app --host 0.0.0.0 --port 8000 --reload

pause
