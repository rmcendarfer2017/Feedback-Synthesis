@echo off
setlocal

echo.
echo   Feedback Synthesis
echo   ──────────────────

:: Check Node
where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo   Node.js is not installed.
  echo   Download it at https://nodejs.org ^(v18 or higher^)
  echo.
  pause
  exit /b 1
)

:: Install dependencies if needed
if not exist "node_modules\" (
  echo.
  echo   Installing dependencies ^(first run only^)...
  call npm install --silent
)

:: Create .env if it doesn't exist (setup wizard in the app will fill it in)
if not exist ".env" (
  copy .env.example .env >nul
  echo.
  echo   First run: complete setup in the browser when the app opens.
  echo.
)

:: Free ports from a previous run (ignore errors if nothing is listening)
echo   Stopping any previous instance...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-ports.ps1" 2>nul

echo.
echo   Starting server and client...
echo   Open the Local URL shown below ^(usually http://localhost:5173^).
echo   If port 5173 is busy, Vite may use 5174 — use that URL instead.
echo.
echo   Keep this window open while using the app.
echo.

call npm run start
