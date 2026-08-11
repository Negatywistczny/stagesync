> [📦 StageSync](../../README.md) / [packages](../README.md)

# 🔑 packages/android-keystore — Stały Certyfikat Sideload

Katalog `packages/android-keystore` zawiera stały klucz podpisujący [`sideload.keystore`](./sideload.keystore) dla wydań APK aplikacji mobilnych StageSync Console oraz Performer.

## 📁 Struktura projektu

- **[`sideload.keystore`](./sideload.keystore)** — Stabilny certyfikat sideload wykorzystywany w GitHub Releases oraz lokalnych kompilacjach (`assembleDebug` / `assembleRelease`).

## 🎨 Standardy i Parametry Klucza

Jest to klucz dla dystrybucji sideload (nie dla sklepu Google Play). Hasło i alias są jawne, analogicznie do kluczy debug w Android SDK:

| Parametr | Wartość |
| :--- | :--- |
| **Hasło keystore / klucza** | `android` |
| **Alias** | `stagesync-sideload` |

## ⚙️ Budowanie i wykorzystanie

Skrypty Gradle (`apps/*/android/app/build.gradle.kts`) wskazują ten plik zarówno dla wariantu `debug`, jak i `release`, zapewniając, że kompilacje CI oraz lokalne korzystają z tego samego certyfikatu. Zapobiega to błędom instalacji `INSTALL_FAILED_UPDATE_INCOMPATIBLE` podczas aktualizacji APK wydanych na GitHub.
