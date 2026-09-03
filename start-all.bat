@echo off
REM Quick Start Script for Kaaval / NodeWatch
REM This script starts the unified backend and both frontends

echo ========================================
echo     Kaaval Digital Custody Setup
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "backend" (
    echo Error: Please run this script from the chain_of_custody root directory
    pause
    exit /b 1
)

echo Starting services...
echo.

REM 1. Start Unified Backend (Port 4000)
echo Starting Unified Backend (Port 4000 - Serves Web & Mobile)...
start cmd /k "cd backend && set PORT=4000&& node src/server.js"

timeout /t 3 /nobreak

REM 2. Start Web Frontend (Port 5173)
echo Starting Web Frontend (Vite)...
start cmd /k "cd frontend_web && npm run dev"

REM 3. Start Mobile Frontend (Expo)
if exist "frontend_mobile" (
    echo Starting Mobile Frontend (Expo)...
    start cmd /k "cd frontend_mobile && npm start"
) else if exist "Kaaval_Frontend" (
    echo Starting Mobile Frontend (Expo)...
    start cmd /k "cd Kaaval_Frontend && npm start"
)

REM 4. Start Legal Portal (Vite)
if exist "frontend_legal" (
    echo Starting Legal Portal (Vite)...
    start cmd /k "cd frontend_legal && npm run dev"
)

echo.
echo ========================================
echo All services starting:
echo.
echo Unified Backend:  http://localhost:4000 (Web + Mobile + Legal APIs)
echo Web Frontend:     http://localhost:5173
echo Legal Portal:     http://localhost:5174 (check terminal for actual port)
echo Mobile App:       Follow Expo CLI instructions
echo.
echo Keep all terminal windows open.
echo ========================================
echo.
