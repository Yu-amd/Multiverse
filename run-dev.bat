@echo off
echo Starting Multiverse development server...
wsl -d Ubuntu-24.04 -e bash -c "cd /home/yu/Multiverse && npm run dev"
pause
