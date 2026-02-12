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

REM Open new terminals for backend and frontend
echo Starting Backend (Node.js - Port 3000)...
start cmd /k "cd Kaaval_Backend && set PORT=3000&& set FABRIC_HOST=localhost&& set FABRIC_TLS_OVERRIDE=peer0.org1.example.com&& set FABRIC_IDENTITY=appUser&& npm install && node app.js"

timeout /t 3 /nobreak

echo Starting Frontend (Expo)...
start cmd /k "cd Kaaval_Frontend && npm install && npm start"

echo Starting Frontend Web (Vite)...
start cmd /k "cd frontend_web && npm install && npm run dev"

echo.
echo ========================================
echo Services starting...
echo.
echo Backend: http://localhost:3000
echo Frontend (Mobile): Follow the Expo CLI instructions
echo Frontend (Web): http://localhost:3000 (or 5173)
echo.
echo Make sure all terminals remain open!
echo ========================================
echo.
