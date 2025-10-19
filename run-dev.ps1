Write-Host "Starting Multiverse development server..." -ForegroundColor Green
wsl -d Ubuntu-24.04 -e bash -c "cd /home/yu/Multiverse && npm run dev"
Read-Host "Press Enter to continue"
