@echo off
echo Testing the Playwright selector fixes...
echo.

echo Running the specific failing tests...
npx playwright test -g "should open settings modal"
if %errorlevel% neq 0 (
    echo Settings modal test still failing
    exit /b 1
)

npx playwright test -g "should display info modal"
if %errorlevel% neq 0 (
    echo Info modal test still failing
    exit /b 1
)

echo.
echo Both previously failing tests now pass! ✅
echo.

echo Running all tests to make sure nothing else broke...
npm test
if %errorlevel% neq 0 (
    echo Some tests are still failing
    exit /b 1
)

echo.
echo All tests pass! 🎉
pause
