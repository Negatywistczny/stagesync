#!/usr/bin/env bash
# Run a full merge train: integrate PRs, test, push, create PR, wait CI, merge, close originals.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

BRANCH="$1"
TITLE="$2"
BODY_FILE="$3"
shift 3
PRS=("$@")

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========== TRAIN: $BRANCH (${#PRS[@]} PRs) =========="
git fetch origin main
git checkout -B "$BRANCH" origin/main

for pr in "${PRS[@]}"; do
  bash "$SCRIPT_DIR/integrate-pr.sh" "$pr"
done

pnpm lint && pnpm check-types && pnpm test && pnpm build

git push -u origin "$BRANCH" --force-with-lease

EXISTING=$(gh pr list --head "$BRANCH" --json number -q '.[0].number' 2>/dev/null || true)
if [[ -n "$EXISTING" && "$EXISTING" != "null" ]]; then
  PR_NUM=$EXISTING
  echo "Reusing PR #$PR_NUM"
else
  PR_NUM=$(gh pr create --base main --head "$BRANCH" --title "$TITLE" --body-file "$BODY_FILE" | grep -o '[0-9]*$')
fi

echo "Waiting for CI on PR #$PR_NUM..."
for i in $(seq 1 20); do
  chk=$(gh pr checks "$PR_NUM" 2>&1 || true)
  if echo "$chk" | grep -q "pending"; then
    sleep 30
  elif echo "$chk" | grep -q "fail"; then
    echo "CI FAILED:"; echo "$chk"; exit 1
  else
    break
  fi
done

gh pr merge "$PR_NUM" --squash --subject "$TITLE" --body "Squash merge train. Closes integrated PRs."

git fetch origin main
git checkout main
git reset --hard origin/main

for pr in "${PRS[@]}"; do
  gh pr close "$pr" --comment "Merged via train PR #$PR_NUM." 2>/dev/null || true
done

echo "========== DONE TRAIN PR #$PR_NUM =========="
