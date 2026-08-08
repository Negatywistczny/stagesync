#!/usr/bin/env bash
# Build StageSync Console debug APK with local host (nodejs-mobile + server assets).
# Requires ANDROID_HOME / ANDROID_SDK_ROOT + JDK 17+ + NDK 26 + CMake 3.22.1.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$ROOT/../.." && pwd)"
ANDROID_DIR="$ROOT/android"
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"

if [[ -z "$SDK" ]]; then
  echo "Error: ANDROID_HOME or ANDROID_SDK_ROOT is not set." >&2
  echo "Run '.\dev doctor' (or ./dev doctor) or check docs/guides/INSTALL.md & docs/guides/MOBILE.md for setup instructions." >&2
  echo "💡 Tip: You can run './scripts/setup/setup.sh' to configure your environment automatically." >&2
  exit 1
fi

export ANDROID_HOME="$SDK"
export ANDROID_SDK_ROOT="$SDK"

# Default: pack libnode + server into the APK. Skip with SKIP_LOCAL_HOST=1
# (LAN-only shell; button still fails open honestly).
if [[ "${SKIP_LOCAL_HOST:-}" != "1" ]]; then
  echo "==> Preparing local host (libnode + server assets)…"
  if [[ "${SKIP_HOST_SERVER:-}" == "1" ]]; then
    (cd "$REPO" && node apps/console/scripts/prepare-local-host.mjs --skip-server)
  else
    (cd "$REPO" && node apps/console/scripts/prepare-local-host.mjs)
  fi
  if [[ ! -f "$ANDROID_DIR/app/src/main/jniLibs/arm64-v8a/libnode.so" ]]; then
    echo "Missing libnode.so after prepare-local-host" >&2
    exit 1
  fi
  if [[ "${SKIP_HOST_SERVER:-}" != "1" && ! -f "$ANDROID_DIR/app/src/main/assets/host/READY" ]]; then
    echo "Missing assets/host/READY after prepare-local-host" >&2
    exit 1
  fi
  if [[ ! -f "$ANDROID_DIR/app/libnode/include/node/node.h" ]]; then
    echo "Missing libnode headers (app/libnode/include/node/node.h)" >&2
    exit 1
  fi
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
  echo "sdk.dir=$SDK" > local.properties
fi
./gradlew assembleDebug "$@"
OUT="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
DEST="$REPO/data/downloads/stagesync-console.apk"
mkdir -p "$(dirname "$DEST")"
cp "$OUT" "$DEST"
echo "Built: $OUT"
echo "Host downloads: $DEST (Admin QR / /downloads/stagesync-console.apk)"
ls -lh "$DEST"
