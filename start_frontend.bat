@echo off
title Premium Sphere — Frontend
echo =============================================
echo  Premium Sphere Frontend Setup
echo =============================================
echo.

cd /d "%~dp0frontend"

:: Check if node_modules exists
if not exist "node_modules" (
    echo [1/2] Installing Node dependencies (this may take a few minutes)...
    cmd /c "npm install --legacy-peer-deps"
    echo      Fixing AJV compatibility for Node.js 24...
    cmd /c "npm install ajv@^8 --legacy-peer-deps"
    echo      Done.
) else (
    echo [1/2] node_modules already exists. Skipping install.
)

echo.
echo [2/2] Starting React dev server on http://localhost:3000 ...
echo       (browser will open automatically)
echo.
echo  Press Ctrl+C to stop.
echo.
cmd /c "npm start"

pause
