#!/bin/bash
# GitHub 최초 업로드 / 수동 push 스크립트
set -e

cd "$(git rev-parse --show-toplevel)"

if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin https://github.com/wskim911227/20260622.git
fi

BRANCH=$(git branch --show-current)
BRANCH=${BRANCH:-main}

echo "→ origin/main 으로 push 중..."
git push -u origin "$BRANCH"
echo "✓ 업로드 완료: https://github.com/wskim911227/20260622"
