@echo off
cd /d "C:\Users\Yadadri Manufacturer\Desktop\Kiro 1"
echo === Fetching remote changes ===
git fetch origin main
echo === Merging remote into local ===
git merge origin/main --no-edit
echo === Popping stash ===
git stash pop
echo === Staging all changes ===
git add -A
echo === Committing ===
git commit -m "fix: redirect onrender.com to shophere.in on mobile"
echo === Pushing ===
git push origin main
echo DONE
pause
