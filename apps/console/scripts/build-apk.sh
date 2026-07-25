#!/usr/bin/env bash
# Build StageSync Console debug APK (requires ANDROID_HOME / ANDROID_SDK_ROOT + JDK 17+).
# Builds apps/web (incl. dist-console = full SPA) so assets/www gets Admin+Timeline+Client (#692).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$ROOT/../.." && pwd)"
ANDROID_DIR="$ROOT/android"

if [[ -z "${ANDROID_HOME:-}" && -z "${ANDROID_SDK_ROOT:-}" ]]; then
  echo "Set ANDROID_HOME or ANDROID_SDK_ROOT to your Android SDK." >&2
  echo "See apps/console/README.md and docs/MOBILE.md" >&2
  exit 1
fi

if [[ "${SKIP_WEB_BUILD:-}" != "1" ]]; then
  echo "==> Building @stagesync/web (full + performer + console role dists)…"
  (cd "$REPO" && pnpm --filter @stagesync/web build)
fi

if [[ ! -f "$REPO/apps/web/dist-console/index.html" ]]; then
  echo "Missing apps/web/dist-console — run: pnpm --filter @stagesync/web build" >&2
  exit 1
fi

cd "$ANDROID_DIR"
if [[ ! -f local.properties ]]; then
  SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
  echo "sdk.dir=$SDK" > local.properties
fi
./gradlew assembleDebug "$@"
OUT="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
echo "Built: $OUT"
echo "Copy to host downloads as stagesync-console.apk when ready for Admin QR."
