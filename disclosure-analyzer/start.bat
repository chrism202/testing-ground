@echo off
REM Real Estate Disclosure Analyzer Startup Script for Windows

echo Starting Real Estate Disclosure Analyzer...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Python 3 is not installed. Please install Python 3.9 or higher.
    pause
    exit /b 1
)

REM Check if Node is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js is not installed. Please install Node.js 18 or higher.
    pause
    exit /b 1
)

REM Backend setup
echo Setting up backend...
cd backend

if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing Python dependencies...
pip install -q -r requirements.txt

echo Starting backend server on http://localhost:8000 ...
start /B python main.py

cd ..

REM Frontend setup
echo.
echo Setting up frontend...
cd frontend

if not exist "node_modules" (
    echo Installing Node dependencies...
    call npm install
)

echo Starting frontend server on http://localhost:3000 ...
start /B npm run dev

cd ..

echo.
echo Application started successfully!
echo.
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:8000
echo.
echo Press any key to stop servers and exit...
pause >nul

taskkill /F /IM python.exe /T >nul 2>&1
taskkill /F /IM node.exe /T >nul 2>&1
