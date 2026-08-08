#!/usr/bin/env bash
# Integrate a GitHub PR onto the current branch via gh pr diff (PR-relative patch).
set -euo pipefail

pr="$1"
title=$(gh pr view "$pr" --json title -q .title)

# commitlint subject-case: lowercase first char after "type(scope): "
commit_msg=$(python3 -c "import sys; t=sys.argv[1]; i=t.find(': '); print(t if i<0 else t[:i+2]+t[i+2].lower()+t[i+3:])" "$title")

echo "=== Integrating PR #$pr: $title ==="

if gh pr diff "$pr" | git apply -3 --index; then
  :
else
  echo "  conflicts — preferring PR (theirs) on remaining hunks"
  for f in $(git diff --name-only --diff-filter=U); do
    git checkout --theirs "$f" 2>/dev/null || git checkout --theirs -- "$f"
    git add "$f"
  done
  if git diff --name-only --diff-filter=U | grep -q .; then
    echo "  UNRESOLVED for PR #$pr"
    git diff --name-only --diff-filter=U
    exit 2
  fi
fi

if git diff --cached --quiet; then
  echo "  SKIP (no changes — already included)"
else
  git commit -m "$commit_msg"
fi
echo "  OK"
