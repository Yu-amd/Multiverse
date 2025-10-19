@echo off
echo Running Multiverse AI Playground Tests...
echo.

echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Failed to install dependencies
    exit /b 1
)

echo.
echo Installing Playwright browsers...
call npx playwright install
if %errorlevel% neq 0 (
    echo Failed to install Playwright browsers
    exit /b 1
)

echo.
echo Running tests...
call npm test
if %errorlevel% neq 0 (
    echo Tests failed
    exit /b 1
)

echo.
echo All tests passed! ✅
pause
