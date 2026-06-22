#!/bin/bash
# Cursor stop hook: 변경사항이 있으면 자동으로 GitHub에 push

cat > /dev/null

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$PROJECT_ROOT" ]; then
  exit 0
fi

cd "$PROJECT_ROOT" || exit 0

if ! git remote get-url origin >/dev/null 2>&1; then
  exit 0
fi

git add -A

if git diff --cached --quiet; then
  exit 0
fi

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
git commit -m "Auto-sync: ${TIMESTAMP}"

BRANCH=$(git branch --show-current)
if [ -z "$BRANCH" ]; then
  BRANCH="main"
fi

git push origin "$BRANCH" 2>/dev/null || git push -u origin "$BRANCH" 2>/dev/null

exit 0
