param([string]$m = "update")

git add -A
git commit -m $m
git pull --rebase origin main
git push
