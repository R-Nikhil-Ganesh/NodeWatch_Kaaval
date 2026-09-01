@echo off
REM Quick Start Script for ChainGuard
REM This script helps you start both frontend and backend

echo ========================================
echo     ChainGuard Integration Setup
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "Kaaval_Backend" (
    echo Error: Please run this script from the chain_of_custody root directory
    pause
    exit /b 1
)

echo Starting both services...
echo.

REM Open new terminals for backends and frontends
echo Starting Mobile Backend (Kaaval_Backend - Port 3000)...
start cmd /k "cd Kaaval_Backend && set PORT=3000&& set FABRIC_HOST=localhost&& set FABRIC_TLS_OVERRIDE=peer0.org1.example.com&& set FABRIC_IDENTITY=appUser&& node app.js"

echo Starting Central Web Backend (backend_web - Port 4000)...
start cmd /k "cd backend_web && set PORT=4000&& npm run start"

timeout /t 3 /nobreak

echo Starting Mobile Frontend (Expo)...
start cmd /k "cd Kaaval_Frontend && npm start"

echo Starting Web Frontend (Vite)...
start cmd /k "cd frontend_web && npm run dev"

echo.
echo ========================================
echo All services starting:
echo.
echo Mobile Backend:  http://localhost:3000
echo Central Backend: http://localhost:4000
echo Web Frontend:    http://localhost:5173
echo Mobile App:      Follow Expo CLI instructions
echo.
echo Keep all terminal windows open.
echo ========================================
echo.
