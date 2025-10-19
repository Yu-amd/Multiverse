#!/bin/bash

echo "Running Multiverse AI Playground Tests..."
echo

echo "Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "Failed to install dependencies"
    exit 1
fi

echo
echo "Installing Playwright browsers..."
npx playwright install
if [ $? -ne 0 ]; then
    echo "Failed to install Playwright browsers"
    exit 1
fi

echo
echo "Running tests..."
npm test
if [ $? -ne 0 ]; then
    echo "Tests failed"
    exit 1
fi

echo
echo "All tests passed! ✅"
