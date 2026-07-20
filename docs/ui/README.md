# Design System UI (StageSync v5)

Kanoniczna dokumentacja warstwy prezentacji. Implementacja tokenów i
komponentów: [`packages/ui`](../../packages/ui/).

| Plik | Zawartość |
|------|-----------|
| [colors.md](./colors.md) | Tokeny `--ss-color-*` (semantyka, nie HEX w shellach) |
| [typography.md](./typography.md) | `--ss-text-*` / weight / leading / tracking |
| [spacing.md](./spacing.md) | Siatka `--ss-space-*` + soft-px / wyjątki layoutu |
| [button.md](./button.md) | `Button` — 7 stanów, props, PWA / touch |

## Zasady

- Style shelli: wyłącznie CSS Modules + `--ss-*` ([ADR 0003](../adr/0003-ui-direction-booth.md)).
- Gęstość / spacing / hover: [`.cursor/rules/ui-density.mdc`](../../.cursor/rules/ui-density.mdc).
- Animacje: `--ss-duration-fast` (120ms) / `normal` (200ms) / `slow` (700ms);
  hover przez `--ss-transition` (= fast + ease). Bez ad-hoc `0.7s` itd.
- Ikony shelli: **Lucide** przez [`apps/web/src/shells/icons.tsx`](../../apps/web/src/shells/icons.tsx)
  — bez nowych lokalnych SVG w shellach.
- Paleta domyślna: black / amber; motywy `data-theme` — osobne zadanie (TODO).
- Nie twórz równoległych komponentów UI poza `@stagesync/ui`.
