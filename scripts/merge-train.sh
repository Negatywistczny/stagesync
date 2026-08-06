#!/usr/bin/env bash
# Merge integration train: fetch PR branches and merge in order.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

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
