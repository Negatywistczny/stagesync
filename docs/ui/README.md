> [📦 StageSync](../../README.md) / [docs](../README.md)

# 🎨 ui/ — Design System UI (StageSync v5)

Kanoniczna dokumentacja warstwy prezentacji. Implementacja tokenów i
komponentów: [`packages/ui`](../../packages/ui/).

| Plik                                             | Zawartość                                                      |
| ------------------------------------------------ | -------------------------------------------------------------- |
| [colors.md](./colors.md)                         | Tokeny `--ss-color-*` (semantyka, nie HEX w shellach)          |
| [typography.md](./typography.md)                 | `--ss-text-*` / weight / leading / tracking                    |
| [spacing.md](./spacing.md)                       | Siatka `--ss-space-*` + soft-px / wyjątki layoutu              |
| [button.md](./button.md)                         | `Button` — 7 stanów, props, PWA / touch                        |
| [field.md](./field.md)                           | `Input` / `Select` / `Textarea` / `Field`                      |
| [badge.md](./badge.md)                           | `Badge` (meta chip)                                            |
| [segmented.md](./segmented.md)                   | `SegmentedControl`                                             |
| [ui-shell-inventory.md](./ui-shell-inventory.md) | Inventarz shelli Admin / Client / Timeline (checklista parity) |

## Warstwy SSOT (anty–ad-hoc)

| Warstwa                       | Wolno                                                                                                           | Zakaz                                                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `@stagesync/ui`               | Tokeny + prymitywy (`Button`, `Slider`, `Input`, `Field`, `Badge`, `SegmentedControl`, …)                       | HEX poza [`tokens.css`](../../apps/desktop/launcher/vendor/tokens.css); warianty Button poza primary/secondary/ghost |
| `apps/web/src/shells/shared/` | Wspólny chrome (PanelCard, MetaBadge, NetworkUrlList, MetricGrid, ShellToolbar)                                 | Duplikowanie geometrii Button/Input                                                                                  |
| Page CSS Modules              | Layout strony, geometria DAW (playhead, lane), soft-px 1–2px                                                    | Lokalny `padding`/`font-size`/`min-height` na kontrolkach; ułamkowe `rem`; HEX                                       |
| Desktop launcher              | Layout cold-start; klasy `ss-btn*` z skopiowanego [`button.css`](../../apps/desktop/launcher/vendor/button.css) | Ręczny `:root` tokenów; mirror `.btn` ([ADR 0014](../adr/0014-desktop-launcher.md) — bez React)                      |

**Wyjątki świadome:** soft-px (`1px`/`2px`) dla border/outline/divider; canvas Timeline (clip/lane); scenic `roleTile` (nie control-size Button). Bramka: `pnpm lint:ss-css` (`/* ss-css-allow */` tylko z uzasadnieniem).

## Zasady

- Style shelli: wyłącznie CSS Modules + `--ss-*` ([ADR 0003](../adr/0003-ui-direction-booth.md)).
- Gęstość / spacing / hover: [`.cursor/rules/ui-density.mdc`](../../.cursor/rules/ui-density.mdc).
- Animacje: `--ss-duration-fast` (120ms) / `normal` (200ms) / `slow` (700ms);
  hover przez `--ss-transition` (= fast + ease). Bez ad-hoc `0.7s` itd.
- Ikony shelli: **Lucide** przez [`apps/web/src/shells/icons.tsx`](../../apps/web/src/shells/components/icons.tsx)
  — bez nowych lokalnych SVG w shellach.
- Wordmark: [`apps/web/src/shells/ShellWordmark.tsx`](../../apps/web/src/shells/components/ShellWordmark.tsx)
  (`Stage` + amber `Sync`; opcjonalnie suffix roli i wersja).
- Chrome shelli (współdzielone): `ShellIconButton`, `SettingsPopover`, `ConnectionIndicator`, `ShellSwitchRow` oraz `shells/shared/*`.
- Launcher: `pnpm sync:launcher-ui` kopiuje [`tokens.css`](../../apps/desktop/launcher/vendor/tokens.css) + [`button.css`](../../apps/desktop/launcher/vendor/button.css) do `apps/desktop/launcher/vendor/`.
- Nie twórz równoległych komponentów UI poza `@stagesync/ui`.
