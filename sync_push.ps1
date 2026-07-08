Set-Location "C:\Users\Yadadri Manufacturer\Desktop\Kiro 1"

Write-Host "=== Fetching remote ===" -ForegroundColor Cyan
& git fetch origin main
Write-Host "Fetch exit: $LASTEXITCODE"

Write-Host "=== Merging ===" -ForegroundColor Cyan
& git merge origin/main --no-edit
Write-Host "Merge exit: $LASTEXITCODE"

Write-Host "=== Popping stash ===" -ForegroundColor Cyan
& git stash pop
Write-Host "Stash pop exit: $LASTEXITCODE"

Write-Host "=== Staging ===" -ForegroundColor Cyan
& git add -A

Write-Host "=== Committing ===" -ForegroundColor Cyan
& git commit -m "fix: redirect onrender.com to shophere.in on mobile"
Write-Host "Commit exit: $LASTEXITCODE"

Write-Host "=== Pushing ===" -ForegroundColor Cyan
& git push origin main
Write-Host "Push exit: $LASTEXITCODE"

Write-Host "=== ALL DONE ===" -ForegroundColor Green
