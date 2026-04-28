@echo off
cd /d "%~dp0"
echo [ProSync] npm install...
npm install
if errorlevel 1 (echo ERROR: npm install failed & pause & exit /b 1)
echo [ProSync] npm run build...
npm run build
if errorlevel 1 (echo ERROR: build failed & pause & exit /b 1)
echo.
echo ===================================
echo Build complete: dist\index.html
echo ===================================
start dist\index.html
pause
