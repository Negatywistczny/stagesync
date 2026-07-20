# Design System UI (StageSync v5)

Kanoniczna dokumentacja warstwy prezentacji. Implementacja tokenów i
komponentów: [`packages/ui`](../../packages/ui/).

| Plik | Zawartość |
|------|-----------|
| [colors.md](./colors.md) | Tokeny `--ss-color-*` (semantyka, nie HEX w shellach) |
| [button.md](./button.md) | `Button` — 7 stanów, props, PWA / touch |
| *typography.md* / *spacing.md* | Planowane — zob. [TODO](../TODO.md) (Design System / docs) |

## Zasady

- Style shelli: wyłącznie CSS Modules + `--ss-*` ([ADR 0003](../adr/0003-ui-direction-booth.md)).
- Gęstość / spacing / hover: [`.cursor/rules/ui-density.mdc`](../../.cursor/rules/ui-density.mdc).
- Paleta domyślna: black / amber; motywy `data-theme` — osobne zadanie (TODO).
- Nie twórz równoległych komponentów UI poza `@stagesync/ui`.
