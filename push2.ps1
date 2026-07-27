Set-Location "C:\Users\Yadadri Manufacturer\Desktop\Kiro 1"
& git add render.yaml db.js
& git commit -m "fix: remove hardcoded PORT from render.yaml, improve DB error messages"
& git push origin main
Write-Host "EXIT:$LASTEXITCODE"
