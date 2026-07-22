#!/usr/bin/env bash
# Integrate a GitHub PR onto the current branch via gh pr diff (PR-relative patch).
set -euo pipefail

pr="$1"
title=$(gh pr view "$pr" --json title -q .title)

echo "=== Integrating PR #$pr: $title ==="

if gh pr diff "$pr" | git apply -3 --index; then
  git commit -m "$title"
  echo "  OK"
else
  echo "  APPLY FAILED for PR #$pr"
  git diff --name-only --diff-filter=U 2>/dev/null || true
  exit 2
fi
