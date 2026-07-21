# Typografia (`--ss-text-*` / weight / leading / tracking)

Źródło: [`packages/ui/src/tokens.css`](../../packages/ui/src/tokens.css).  
**Zakaz** ad-hoc `font-size`, `font-weight`, `line-height`, `letter-spacing` w
shellach i `@stagesync/ui` — tylko tokeny poniżej.

Font stack: `--ss-font-sans` (Sora / IBM Plex Sans).

## Skala rozmiaru

| Token | Wartość | Kiedy |
|-------|---------|--------|
| `--ss-text-xs` | 0.75rem | Metadane, odznaki, bardzo ciasny chrome |
| `--ss-text-sm` | 0.8125rem | Etykiety drugorzędne, status bar |
| `--ss-text-control` | 0.875rem | **Button**, inputy, główny chrome toolbarów |
| `--ss-text-md` | 0.9375rem | Treść paneli / listy |
| `--ss-text-lg` | 1.125rem | Nagłówki sekcji shelli |
| `--ss-text-xl` | 1.5rem | Tytuł widoku / duże etykiety |
| `--ss-text-2xl` | 2rem | Hero mobile / duże kafle |
| `--ss-text-3xl` | 3rem | Display hero (np. wybór roli Client) |

Alias: `--ss-font-size` → `var(--ss-text-control)` (domyślny rozmiar UI).

### Skala sceniczna (Client / PWA)

Fluid `clamp()` **tylko** w `tokens.css` jako `--ss-text-stage-*` — shelly używają `var(...)`.

| Token | Rola |
|-------|------|
| `--ss-text-stage-micro` … `--ss-text-stage-5xl` | Etykiety → countdown / karaoke |
| `--ss-text-stage-hero-sm` / `--ss-text-stage-hero-lg` | Warianty hero w `@media` |

## Waga

| Token | Wartość | Kiedy |
|-------|---------|--------|
| `--ss-font-weight-regular` | 400 | Body / opisy |
| `--ss-font-weight-medium` | 500 | Etykiety wyróżnione |
| `--ss-font-weight-semibold` | 600 | **Button**, aktywne kontrole |
| `--ss-font-weight-bold` | 650 | Nagłówki (oszczędnie) |
| `--ss-font-weight-heavy` | 700 | Scena: drugorzędny display |
| `--ss-font-weight-black` | 800 | Scena: chord hero / kafle |

## Leading

| Token | Wartość | Kiedy |
|-------|---------|--------|
| `--ss-leading-display` | 1.1 | Jednowierszowy display (hero) |
| `--ss-leading-compact` | 1.15 | Button, icon+label w jednym rzędzie |
| `--ss-leading-snug` | 1.2 | Etykiety sekcji / ciasny display |
| `--ss-leading-tight` | 1.25 | Ciasne rzędy toolbarów |
| `--ss-leading-normal` | 1.35 | Domyślny tekst UI |
| `--ss-leading-relaxed` | 1.5 | Dłuższe bloki / help |

Alias: `--ss-line-height` → `var(--ss-leading-normal)`.

## Tracking

| Token | Wartość | Kiedy |
|-------|---------|--------|
| `--ss-tracking-normal` | 0 | Domyślnie |
| `--ss-tracking-tight` | −0.02em | Display / hero titles |
| `--ss-tracking-label` | 0.06em | Małe etykiety ALL CAPS / section labels |
| `--ss-tracking-wide` | 0.1em | Section labels Client (uppercase) |

## Button (kanon)

`font-size: var(--ss-text-control)`, `font-weight: semibold`,
`line-height: compact` — zob. [button.md](./button.md).
