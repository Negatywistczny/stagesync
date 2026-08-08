#!/usr/bin/env bash
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
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

BRANCH="$1"
TITLE="$2"
shift 2
PRS=("$@")

git fetch origin main
git checkout -B "$BRANCH" origin/main

for pr in "${PRS[@]}"; do
  state=$(gh pr view "$pr" --json state -q .state 2>/dev/null || echo "CLOSED")
  if [[ "$state" != "OPEN" ]]; then
    echo "SKIP closed #$pr"
    continue
  fi
  bash "$SCRIPT_DIR/integrate-pr.sh" "$pr"
done

pnpm lint && pnpm check-types && pnpm test && pnpm build
git push -u origin "$BRANCH" --force-with-lease

TRAIN_PR=$(gh pr list --head "$BRANCH" --json number -q '.[0].number' 2>/dev/null || true)
if [[ -z "$TRAIN_PR" || "$TRAIN_PR" == "null" ]]; then
  TRAIN_PR=$(gh pr create --base main --head "$BRANCH" --title "$TITLE" --body "Merge train batch" | grep -oE '[0-9]+$')
fi

for i in $(seq 1 15); do
  chk=$(gh pr checks "$TRAIN_PR" 2>&1 || true)
  if echo "$chk" | grep -q pending; then sleep 30
  elif echo "$chk" | grep -q fail; then echo "CI FAIL"; echo "$chk"; exit 1
  else break; fi
done

gh pr merge "$TRAIN_PR" --squash --subject "$TITLE"

for pr in "${PRS[@]}"; do
  gh pr close "$pr" --comment "Merged via train PR #$TRAIN_PR." 2>/dev/null || true
done

git fetch origin main
git checkout main
git reset --hard origin/main
echo "TRAIN_PR=$TRAIN_PR"
