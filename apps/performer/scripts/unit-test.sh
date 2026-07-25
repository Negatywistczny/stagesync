#!/usr/bin/env bash
# JVM unit tests for StageSync Performer (no device). Skips cleanly without Android SDK
# so turbo/pnpm test stays green on machines without ANDROID_HOME.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT/android"

if [[ -z "${ANDROID_HOME:-}" && -z "${ANDROID_SDK_ROOT:-}" ]]; then
  # Homebrew android-commandlinetools layout (common on macOS CI/dev).
  if [[ -d /opt/homebrew/share/android-commandlinetools ]]; then
    export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
    export ANDROID_SDK_ROOT="$ANDROID_HOME"
  else
    echo "@stagesync/performer: skip unit tests (set ANDROID_HOME / ANDROID_SDK_ROOT)" >&2
    exit 0
  fi
fi

cd "$ANDROID_DIR"
if [[ ! -f local.properties ]]; then
  SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
  echo "sdk.dir=$SDK" > local.properties
fi
./gradlew test --no-daemon "$@"
