# Kolory (`--ss-color-*`)

Źródło: [`packages/ui/src/tokens.css`](../../packages/ui/src/tokens.css).  
**Zakaz** wpisywania surowych HEX / `rgb()` w shellach i komponentach UI — tylko tokeny.

## Profile chrome (5.3 Colors & Channels)

Atrybut `html[data-theme="<id>"]` — jeden profil, bez osobnego `data-contrast`.

| ID | Nazwa | Charakter |
|----|-------|-----------|
| `booth` | Booth Amber | Domyślna reżyserka (black / amber) |
| `daylight` | Daylight | Jasny, wysoka czytelność (plener) |
| `midnight` | Midnight Cyan | Ciemny navy + cyan |
| `matrix` | Matrix Green | Fosfor / niski spill |
| `neon` | Neon Ember | Ciemny + ember/orange CTA |

Host: `STAGESYNC_THEME_DEFAULT` (te ID; aliasy legacy `dark`/`light`/`*-high` → booth/daylight).  
Klient: `localStorage` `stagesync-appearance-profile` (migracja ze starych `stagesync-theme` / `stagesync-contrast`).

### Niezmienniki THM-03 (nie remapowane per skin)

| Token | Rola |
|-------|-------|
| `--ss-color-solo` / `-solo-fg` | Solo DAW |
| `--ss-color-mute` / `-mute-fg` | Mute DAW |
| `--ss-color-osmd-paper` | Papier partytury (zawsze jasny) |

Playhead Timeline = `--ss-color-info`; locator = `--ss-color-primary` (hue CTA może się zmieniać ze skórą — sygnały pozostają rozłączne).

Kolory **ścieżek** DAW (`track-appearance`) to osobna paleta projektu — nie chrome.

## Semantyka

| Token | Rola |
|-------|------|
| `--ss-color-bg` | Canvas |
| `--ss-color-surface` | Elevation 1dp (chrome, panele) |
| `--ss-color-elevated` | Elevation 2dp (karty, modale) |
| `--ss-color-text` | Tekst główny (anti-halation) |
| `--ss-color-text-muted` | Metadane / etykiety drugorzędne |
| `--ss-color-primary` | CTA / akcent profilu |
| `--ss-color-primary-hover` / `-active` | Stany CTA |
| `--ss-color-on-primary` | Tekst na primary |
| `--ss-color-secondary` (+ hover/active) | Akcje wspierające |
| `--ss-color-ghost-hover` / `-active` | Ghost |
| `--ss-color-border-muted` / `--ss-color-border` / `-active` | Krawędzie |
| `--ss-color-focus-ring` | Focus outline (a11y) |
| `--ss-color-selected` / `-selected-border` | Zaznaczenie |
| `--ss-color-disabled-bg` / `-disabled-text` | Disabled |
| `--ss-color-danger` | Błąd / destrukcja |
| `--ss-color-success` | Sukces / OK |
| `--ss-color-warning` | Ostrzeżenie (≠ primary CTA) |
| `--ss-color-info` | Informacja / playhead |

Status (`success` / `warning` / `info` / `danger`) — pod wskaźniki, toast, status bar; nie zastępują `primary` jako głównego CTA.

## Minimalizm marki

- **Jedna** barwa akcentu interakcji na profil: `--ss-color-primary` / `--ss-color-selected*`.
- Role Client (karaoke / grid / score / drums) różnicuj **etykietą / ikoną / treścią**, nie tęczą hoverów.
- **Zakaz** mapowania ról na `success` / `warning` / `info` / `focus-ring` „dla kolorów kafli”.
- `focus-ring` = wyłącznie a11y outline, nie dekoracja marki.
