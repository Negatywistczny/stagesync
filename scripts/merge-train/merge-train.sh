#!/usr/bin/env bash
# Merge integration train: fetch PR branches and merge in order.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if [[ ! -d "$REPO_ROOT/.git" || ! -f "$REPO_ROOT/package.json" ]]; then
  echo "Error: could not locate StageSync repo root from $(dirname "$0")" >&2
  exit 1
fi
cd "$REPO_ROOT"

if ! command -v git &>/dev/null; then
  echo "Error: 'git' is required but not installed. Run .\dev doctor or see docs/guides/INSTALL.md" >&2
  exit 1
fi

if ! command -v gh &>/dev/null; then
  echo "Error: GitHub CLI ('gh') is required but not installed. Run .\dev doctor or see docs/guides/INSTALL.md" >&2
  exit 1
fi

BRANCH="$1"
shift
PRS=("$@")

if [[ ${#PRS[@]} -eq 0 ]]; then
  echo "Usage: merge-train.sh <branch> <pr-numbers...>"
  exit 1
fi

git fetch origin main
git checkout -B "$BRANCH" origin/main

for pr in "${PRS[@]}"; do
  title=$(gh pr view "$pr" --json title -q .title)
  echo "=== Merging PR #$pr: $title ==="
  git fetch origin "pull/$pr/head:pr-$pr"
  if ! git merge "pr-$pr" -m "$title"; then
    echo "CONFLICT on PR #$pr — resolve manually then re-run from this branch"
    exit 2
  fi
done

echo "MERGE_TRAIN_DONE: $BRANCH (${#PRS[@]} PRs)"
