Write-Host "=== git status ===" -ForegroundColor Cyan
git status

Write-Host "`n=== git add -A ===" -ForegroundColor Cyan
git add -A

Write-Host "`n=== git commit ===" -ForegroundColor Cyan
git commit -m "refonte design Nakama sur toutes les pages"

Write-Host "`n=== git push ===" -ForegroundColor Cyan
git push

Write-Host "`n=== Termine ===" -ForegroundColor Green
