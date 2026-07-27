Set-Location "C:\Users\Yadadri Manufacturer\Desktop\Kiro 1"

Write-Host "=== npm install (regenerate lock file) ===" -ForegroundColor Cyan
& npm install
Write-Host "npm install exit: $LASTEXITCODE"

Write-Host "=== git add ===" -ForegroundColor Cyan
& git add package.json package-lock.json

Write-Host "=== git commit ===" -ForegroundColor Cyan
& git commit -m "fix: downgrade dotenv to v16 (v17 does not exist, fixes Render build failure)"

Write-Host "=== git push ===" -ForegroundColor Cyan
& git push origin main
Write-Host "Push exit: $LASTEXITCODE"

Write-Host "=== DONE ===" -ForegroundColor Green
