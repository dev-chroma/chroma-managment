@echo off
echo ==============================================
echo   Syncing ChromaDiaries to GitHub...
echo ==============================================
git status
git add -A
git commit -m "update: website changes (%date% %time%)"
git push origin main
echo ==============================================
echo   Done! Your changes are live on GitHub.
echo ==============================================
pause
