> [📦 StageSync](../../README.md) / [packages](../README.md)

# 🔧 @stagesync/eslint-config — Współdzielona Konfiguracja Linterów

Pakiet `@stagesync/eslint-config` dostarcza scentralizowaną konfigurację ESLint dla całego monorepo StageSync, wymuszając spójność stylu kodowania we wszystkich aplikacjach i pakietach.

## 📁 Struktura projektu

| Plik | Przeznaczenie |
|:---|:---|
| [`base.js`](./base.js) | Bazowy preset ESLint — reguły wspólne dla całego projektu |
| [`react-internal.js`](./react-internal.js) | Rozszerzenie dla pakietów React (`@stagesync/ui`, `apps/web`) |
| [`acl.js`](./acl.js) | Reguły ACL (_Access Control Layer_) — wymuszanie granic importów między modułami |

## ⚙️ Budowanie i testowanie

Aplikacje i pakiety dziedziczą konfigurację poprzez `extends` w swoich plikach ESLint:

```js
module.exports = {
  extends: ["@stagesync/eslint-config/base"],
};
```

Pakiet jest linkowany lokalnie przez pnpm workspaces — bez publikacji do rejestru npm.
