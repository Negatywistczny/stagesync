# Kolory (`--ss-color-*`)

Źródło: [`packages/ui/src/tokens.css`](../../packages/ui/src/tokens.css).  
**Zakaz** wpisywania surowych HEX / `rgb()` w shellach i komponentach UI — tylko tokeny.

## Semantyka

| Token | Rola |
|-------|------|
| `--ss-color-bg` | Canvas (absolute black) |
| `--ss-color-surface` | Elevation 1dp (chrome, panele) |
| `--ss-color-elevated` | Elevation 2dp (karty, modale) |
| `--ss-color-text` | Tekst główny (anti-halation) |
| `--ss-color-text-muted` | Metadane / etykiety drugorzędne |
| `--ss-color-primary` | CTA / marka amber |
| `--ss-color-primary-hover` / `-active` | Stany CTA |
| `--ss-color-on-primary` | Tekst na amber |
| `--ss-color-secondary` (+ hover/active) | Akcje wspierające |
| `--ss-color-ghost-hover` / `-active` | Ghost |
| `--ss-color-border-muted` / `--ss-color-border` / `-active` | Krawędzie |
| `--ss-color-focus-ring` | Focus outline (a11y) |
| `--ss-color-selected` / `-selected-border` | Zaznaczenie |
| `--ss-color-disabled-bg` / `-disabled-text` | Disabled |
| `--ss-color-danger` | Błąd / destrukcja |
| `--ss-color-success` | Sukces / OK |
| `--ss-color-warning` | Ostrzeżenie (≠ primary CTA) |
| `--ss-color-info` | Informacja / neutralny akcent |

Status (`success` / `warning` / `info` / `danger`) — pod wskaźniki, toast, status bar; nie zastępują `primary` jako głównego CTA.

## Minimalizm marki (black / amber)

- **Jedna** barwa akcentu interakcji: `--ss-color-primary` / `--ss-color-selected*`.
- Role Client (karaoke / grid / score / drums) różnicuj **etykietą / ikoną / treścią**, nie tęczą hoverów.
- **Zakaz** mapowania ról na `success` / `warning` / `info` / `focus-ring` „dla kolorów kafli”.
- `focus-ring` = wyłącznie a11y outline, nie dekoracja marki.
