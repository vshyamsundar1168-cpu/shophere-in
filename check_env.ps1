Set-Location "C:\Users\Yadadri Manufacturer\Desktop\Kiro 1"

Write-Host "=== Checking git log (last 5 commits) ===" -ForegroundColor Cyan
& git log --oneline -5

Write-Host "`n=== Checking what Render sees (remote HEAD) ===" -ForegroundColor Cyan
& git ls-remote origin HEAD

Write-Host "`n=== Current render.yaml ===" -ForegroundColor Cyan
Get-Content render.yaml

Write-Host "`n=== Done ===" -ForegroundColor Green
