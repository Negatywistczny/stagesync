# ADR 0011 — Parity behawioralna i redesign IA (rebuild alpha)

- **Status:** Zaakceptowany
- **Data:** 2026-07-20
- **Zastępuje w części:** [ADR 0003](./0003-ui-direction-booth.md) pkt „inventarz = parity” (priorytet review)
- **Etap:** rebuild przed β — **bez** tagu `5.0.0-beta.*` do green PO smoke wg tych zasad

## Kontekst

v5 alpha zebrała:

1. **Inventarz-first** — odhaczanie kontrolek v4 (`disabled` OK) zamiast przywracania
   **gestów i workflow**.
2. **Clone chrome** — pasek narzędzi / ikony „jak w v4” przy twardych regułach DS
   (tokeny, `Button`, zakaz gotowców) → wizualny potworek: *mniej spójny przez
   próby dopasowania*.
3. **Admin IA** — zbyt duże ekrany; Setlista „dodaj zaznaczone” bez zaznaczania na
   tym samym ekranie.
4. **Client regres** — dopracowany nagłówek, główne widoki ról = suchy tekst /
   stub zamiast treści scenicznej v4.

v5 to **nowa odsłona**, nie port 1:1 HTML. Ma być **logiczna i spójna**, a
funkcje Timeline (zwłaszcza metrum / mapy / edycja), które w 4.x były dopracowane,
**muszą wrócić jako zachowanie** — nie jako atrapa toolbara.

Referencja zachowania: `STAGESYNC-APP-LEGACY`
(`src/public/timeline/timeline.js`, `song-maps.js`, `chord-grid.js`, Client views).

## Decyzja

### 1. Parity = zachowanie, nie lista ikon

| Dozwolone | Zakazane |
|-----------|----------|
| Mapować **gesty** v4 → v5 (pencil, drag map, scrub, grid akordów…) | Odhaczać „jest przycisk” bez smoke PO |
| Jawne OUT z uzasadnieniem | Twierdzić „engineering ready” bez green PO smoke |
| Referencja kodu legacy jako **spec zachowania** | Kopiować markup / CSS / pasek ikon 1:1 z 4.x |

**Done** funkcji Timeline = PO może wykonać ten sam workflow co w 4.x
(w granicach jawnego OUT), nie „kod wired / partial”.

### 2. Zakaz clone chrome / gotowców UI

- Chrome (toolbar, header, status) tylko przez **`@stagesync/ui`** + CSS Modules +
  `--ss-*` ([konstytucja](../../.cursor/rules/constitution.mdc),
  [ui-density](../../.cursor/rules/ui-density.mdc)).
- **Zakaz:** importowanie „gotowego” paska z v4, emoji-chrome, ad-hoc HEX,
  Tailwind, inline style (poza dynamicznym %).
- Ikony (np. Lucide) OK jako **glyph** w `Button` / `ShellIconButton` — **nie**
  jako usprawiedliwienie sklonowanego layoutu legacy.
- Nowa kontrolka w inventarzu wymaga **miejsca w IA v5** i zachowania; nie
  „bo było w v4”.

### 3. Priorytet rebuild (kolejność)

1. **Timeline — sterowanie + canvas** (P0):
   - Forma + content + **mapy** (SongMaps) + locator/loop;
   - **grid** meterMap + beat ticks @ zoom (jak v4 `pxb≥56`);
   - **zoom H/V/UI** naprawdę skalujące; suwaki `accent-color: primary` (nie native blue
     na range — to kontrast kontrolek, nie decyzja o kolorze playhead);
   - snap Forma do **miar taktu**; overwrite jak v4;
   - header: song **center** + breakpoint; help proporcje;
   - wskaźniki Timeline: **nie** scalaj locatora i playheadu bez decyzji PO
     (w v4 to dwa sygnały — żółty locator vs cyjan/`info` MIDI playhead).
2. **Client — treść ról** (P0): karaoke / grid / Forma — nie suchy tekst.
3. **Admin — IA** (P0): mniejsze powierzchnie; Set + wybór utworów w jednym flow.
4. Inventarz — **wtórny**; po geście.
5. Tablet/mobile tiers — Should po P0 desktop (logika z `timeline-touch.js`, nie clone HTML).

### 4. Review i język agentów

- Przy PR UI: **najpierw** „czy gest działa jak v4 (smoke)?”, **potem** tokeny /
  gęstość, **na końcu** inventarz.
- Zakaz zamykania zadania słowami: *wired*, *partial*, *parity done* bez
  ścieżki smoke PO.
- „Bliżej v4” = **feel + workflow**, nigdy = „te same przyciski”.
- **Zakaz disabled-for-inventory:** nie wstawiać `disabled` kontrolek w
  status/toolbar „na zapas” (np. Tr./Lead/Edycja, MIDI bridge), gdy API /
  flow jeszcze nie istnieje. Brak funkcji = **brak UI**; slot wraca z prawdziwym
  zachowaniem (Live Desk / β2), nie jako atrapa inventarza.

### 4a. Zakaz automatycznego redesignu (kolory / wskaźniki / IA)

**Hard rule:** agent **nie** wprowadza przy okazji zmian wizualnych ani semantycznych
(kolory, affordances, collapsowanie dwóch sygnałów v4 w jeden, rename chrome)
bez uzasadnienia.

| Wymagane | Zakazane |
|----------|----------|
| Uzasadnienie: referencja zachowania v4 **lub** jawna prośba PO | „Bo black/amber / minimalizm / spójność DS” bez pytania |
| Zostaw jak jest / zapytaj przy wątpliwości | Ciche „ulepszenia” wskaźników (np. playhead → `primary`) |
| Minimalizm CTA (`primary`/`selected`) | Scalanie **odrębnych** sygnałów operacyjnych (locator ≠ playhead) |

Revert koloru playhead/locator — **tylko** po potwierdzeniu PO (stan obecny może
być regresją względem v4; nie cofaj automatycznie w tej samej sesji bez prośby).

### 5. Co zostaje z ADR 0003

- Paleta black / amber; layout paneli **nowy** (nie HTML 4.x 1:1).
- Model: 1 akord = 1 clip; Countdown; Audio 0…N (lane UI ukryte; playback → β2).
- CSS Modules + `--ss-*`.
- **Minimalizm:** jedna barwa akcentu **interakcji** (`primary` / `selected`) —
  nie „wszystkie markery timeline = amber”. Role / kategorie = etykieta + ikona +
  treść — **nie** tęcza z tokenów statusu na kafelkach ról
  ([colors.md](../ui/colors.md)). Wskaźniki transportowe (locator / playhead)
  zostają **odrębnymi** sygnałami, dopóki PO nie zdecyduje inaczej.

### 6. Bramka β

Bez zmian względem polityki: **zakaz** `5.0.0-beta.*` do green CI **i** green
PO smoke wg tej decyzji + [parity-blocker](../analysis/reports/report-parity-blocker-alpha8.md).

## Konsekwencje

- [ADR 0003](./0003-ui-direction-booth.md) zaktualizowany: inventarz nie rządzi review.
- Reguła agenta `.cursor/rules/ui-parity.mdc` + konstytucja.
- TODO = aktywny etap (**α9** po α8 code freeze): residual PO smoke + Client CL-P0 + migrator — nie „odhacz inventarz”.
- Kod clone-chrome i atrapy mogą zostać usunięte / przebudowane w kolejnych PR —
  ten ADR ustala **kontrakt**, nie wymusza jednego mega-diffu.
