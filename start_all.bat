@echo off
title Premium Sphere — Launcher
echo =============================================
echo   Premium Sphere — Local Launcher
echo =============================================
echo.
echo This will open two terminal windows:
echo   1. Backend  (http://localhost:8000)
echo   2. Frontend (http://localhost:3000)
echo.
echo Make sure MongoDB is running first!
echo.
pause

start "Backend" cmd /k "%~dp0start_backend.bat"
timeout /t 5 /nobreak >nul
start "Frontend" cmd /k "%~dp0start_frontend.bat"

echo.
echo Both servers are starting...
echo Open http://localhost:3000 in your browser.
echo.
pause
