# `@stagesync/ui`

Design system StageSync: tokeny CSS (`--ss-*`) i prymitywy prezentacji
(`Button`, `Slider`, `Input` / `Select` / `Textarea` / `Field`, `Badge`,
`SegmentedControl`, `ContextMenu`).

## Użycie

```ts
import { Button, Input, Field } from "@stagesync/ui";
import "@stagesync/ui/tokens.css";
```

Desktop launcher (statyczny HTML, bez React) bierze te same pliki przez
`pnpm sync:launcher-ui` → `apps/desktop/launcher/vendor/{tokens,button}.css`
i klasy `ss-btn*`.

## Eksporty

| Ścieżka | Zawartość |
|---------|-----------|
| `@stagesync/ui` | komponenty + typy |
| `@stagesync/ui/tokens.css` | `:root` — kolory, spacing, typografia |
| `@stagesync/ui/button.css` | klasy `.ss-btn*` (także dla launchera) |

## Dokumentacja

- [docs/ui/](../../docs/ui/README.md) — warstwy SSOT, Button, Field, Badge, Segmented
- [ADR 0003](../../docs/adr/0003-ui-direction-booth.md) — black / amber
- [ui-density.mdc](../../.cursor/rules/ui-density.mdc) — gęstość / hover

Bez logiki biznesowej i bez I/O — tylko prezentacja.
