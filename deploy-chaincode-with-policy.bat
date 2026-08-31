@echo off
REM Deploy Chaincode with Endorsement Policy (Windows)
REM This script must be run from WSL or Git Bash on Windows

echo ================================================
echo Deploying Evidence Chaincode with Endorsement Policy
echo ================================================
echo.
echo Policy: AND('Org1MSP.peer','Org2MSP.peer')
echo This requires BOTH organizations to approve transactions
echo.

REM Check if running in WSL/Git Bash
where bash >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: This script requires WSL or Git Bash to be installed
    echo.
    echo Please either:
    echo   1. Run this from WSL: wsl bash deploy-chaincode-with-policy.sh
    echo   2. Run from Git Bash
    echo   3. Manually execute the commands shown in ENDORSEMENT_QUICK_START.md
    echo.
    pause
    exit /b 1
)

echo Running deployment via bash...
echo.

REM Execute the bash script
bash deploy-chaincode-with-policy.sh

echo.
echo ================================================
echo Deployment Complete!
echo ================================================
echo.
echo See ENDORSEMENT_QUICK_START.md for next steps
echo.
pause
