@echo off
echo 🚀 Starting SimpleCRM in Development Mode with DevTools
echo.

echo 📋 Setting environment variables...
set NODE_ENV=development
set VITE_DEV_SERVER_URL=http://localhost:5173

echo 📋 Environment set:
echo   NODE_ENV=%NODE_ENV%
echo   VITE_DEV_SERVER_URL=%VITE_DEV_SERVER_URL%
echo.

echo 🔧 Building electron components...
call npm run build:electron

echo.
echo 🚀 Starting Electron app...
echo ⚠️  DevTools will open automatically!
echo ⚠️  Keep this terminal open to see backend logs
echo.

call npm run electron:start