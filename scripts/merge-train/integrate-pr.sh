#!/usr/bin/env bash
# Integrate a GitHub PR onto the current branch via gh pr diff (PR-relative patch).
set -euo pipefail

if ! command -v git &>/dev/null; then
  echo "Error: 'git' is required but not installed. Run .\dev doctor or see docs/guides/INSTALL.md" >&2
  exit 1
fi

if ! command -v gh &>/dev/null; then
  echo "Error: GitHub CLI ('gh') is required but not installed. Run .\dev doctor or see docs/guides/INSTALL.md" >&2
  exit 1
fi

pr="$1"
title=$(gh pr view "$pr" --json title -q .title)

# commitlint subject-case: lowercase first char after "type(scope): " using Node.js
if ! command -v node &>/dev/null; then
  echo "Error: 'node' is required but not installed. Run .\dev doctor or see docs/guides/INSTALL.md" >&2
  exit 1
fi
commit_msg=$(node -e '
  const t = process.argv[1];
  const i = t.indexOf(": ");
  if (i < 0) { console.log(t); }
  else {
    const prefix = t.slice(0, i + 2);
    const rest = t.slice(i + 2);
    console.log(prefix + rest.charAt(0).toLowerCase() + rest.slice(1));
  }
' "$title")

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
