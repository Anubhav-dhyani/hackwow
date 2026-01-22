@echo off
echo ============================================
echo   STARTING HACKWOW BACKEND + FRONTEND1
echo ============================================
echo.

REM Check if backend is already running
tasklist /FI "WINDOWTITLE eq Backend Server" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [INFO] Backend already running
) else (
    echo [STARTING] Backend server...
    start "Backend Server" cmd /k "cd /d d:\hee\hackwow\backend\src && node server.js"
    timeout /t 3 /nobreak >nul
)

REM Check if frontend is already running
tasklist /FI "WINDOWTITLE eq Frontend1" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [INFO] Frontend1 already running
) else (
    echo [STARTING] Frontend1 dev server...
    start "Frontend1" cmd /k "cd /d d:\hee\frontend1 && npm run dev"
    timeout /t 3 /nobreak >nul
)

echo.
echo ============================================
echo   SERVERS STARTED
echo ============================================
echo.
echo Backend:   http://localhost:5000
echo Frontend:  http://localhost:3000 (or 5173/5174)
echo.
echo Check the opened terminal windows for URLs
echo.
echo Test credentials:
echo   Email: test@example.com
echo   Password: password123
echo.
echo Press any key to open browser...
pause >nul

start http://localhost:3000

echo.
echo To stop servers: Close the terminal windows
echo.
pause
