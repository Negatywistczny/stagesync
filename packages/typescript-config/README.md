> [📦 StageSync](../../README.md) / [packages](../README.md)

# ⚙️ @stagesync/typescript-config — Bazowe Konfiguracje TypeScript

Pakiet `@stagesync/typescript-config` dostarcza współdzielone pliki konfiguracyjne TypeScript dla wszystkich aplikacji i bibliotek w monorepo.

## 📁 Struktura projektu

| Plik | Przeznaczenie | Rozszerza |
|:---|:---|:---|
| [`base.json`](./base.json) | Bazowy preset: `strict`, `ES2022`, `NodeNext`, `isolatedModules` | — |
| [`node-library.json`](./node-library.json) | Biblioteki Node.js (`@stagesync/shared`, serwer) — emit do `dist/` z deklaracjami `.d.ts` | `base.json` |
| [`react-library.json`](./react-library.json) | Biblioteki React (`@stagesync/ui`) — dodaje `jsx: react-jsx` | `base.json` |

## ⚙️ Budowanie i testowanie

Aplikacje i pakiety dziedziczą konfigurację poprzez `extends` w swoich `tsconfig.json`:

```json
{
  "extends": "@stagesync/typescript-config/base.json"
}
```

Pakiet jest linkowany lokalnie przez pnpm workspaces — bez publikacji do rejestru npm.
