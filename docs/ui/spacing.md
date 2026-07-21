# Spacing (`--ss-space-*`)

Źródło: [`packages/ui/src/tokens.css`](../../packages/ui/src/tokens.css).  
Reguła egzekucji: [`.cursor/rules/ui-density.mdc`](../../.cursor/rules/ui-density.mdc).

**Zakaz** ad-hoc `px` / ułamkowych `rem` dla margin / padding / gap / wymiarów
kontrolek — tylko siatka poniżej.

## Siatka 4pt / 8pt

| Token | Wartość | Typowe użycie |
|-------|---------|---------------|
| `--ss-space-1` | 4px | Micro: badge padding, ekstremalnie ciasny gap |
| `--ss-space-2` | 8px | **Gap icon+text**; padding icon-only Button; min. przerwa touch |
| `--ss-space-3` | 12px | Padding toolbarów / kompaktowych paneli |
| `--ss-space-4` | 16px | Domyślny padding sekcji |
| `--ss-space-5` | 20px | Luźniejszy padding paneli |
| `--ss-space-6` | 24px | Wysokość skondensowanego rzędu |
| `--ss-space-8` | 32px | Granica panelu / większy padding kart |
| `--ss-space-10` | 40px | Duże odstępy sekcji |
| `--ss-space-12` | 48px | Separacja bloków |
| `--ss-space-16` | 64px | Maksymalny rytm layoutu |

## Aliasy

| Token | Alias | Uwagi |
|-------|-------|--------|
| `--ss-space-x` | `space-3` | Poziomy rytm formularzy / list |
| `--ss-space-y` | `space-2` | Pionowy rytm |
| `--ss-scrollbar-width` | `space-2` | Scenic scrollbary — nie redefiniuj w shellach |
| `--ss-touch-min` | `36px` | Min. hit desktop (icon / Play) — ui-density §5 |
| `--ss-touch-min-client` | `44px` | Min. hit Client PWA |

## Soft-px (wyjątek)

Bezpośrednie `1px` / `2px` **tylko** dla: `border`, `border-width`, `outline`,
`outline-width`, pozycji dividerów oraz krawędzi w `box-shadow`.

## Layout shelli (poza siatką)

Sztywne szerokości chrome, `min()` / `vh` / procenty siatki timeline **mogą**
pozostać poza `--ss-space-*`, gdy opisują geometrię viewportu, nie gęstość
kontrolek. Nie mapuj ich na siatkę na siłę — nowe **margin / padding / gap**
nadal tylko przez tokeny.
