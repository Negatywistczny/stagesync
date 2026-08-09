# Android sideload signing

[`sideload.keystore`](./sideload.keystore) is the **stable** signing key for StageSync Console / Performer
sideload APKs (GitHub Releases + local `assembleDebug` / `assembleRelease`).

It is **not** a Google Play upload key. Password and alias are intentional for
sideload MVP (same idea as the Android debug keystore):

|                      |                      |
| -------------------- | -------------------- |
| Store / key password | `android`            |
| Alias                | `stagesync-sideload` |

Gradle (`apps/*/android/app/build.gradle.kts`) points both `debug` and `release`
at this file so CI and local builds share one certificate. Ephemeral
`~/.android/debug.keystore` on GitHub runners previously made each Release APK
impossible to upgrade over the previous cut (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`).
