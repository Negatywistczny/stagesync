# UI-diff inventory v4 ↔ v5 (Część B)

**Data:** 2026-07-20 (synchro z α8 code freeze — inventarz wtórny wobec [gap-audit](./report-v4-v5-gap-audit.md))  
**Część A:** [report-v4-v5-parity-audit.md](./report-v4-v5-parity-audit.md)  
**SSOT luk behawioralnych:** [report-v4-v5-gap-audit.md](./report-v4-v5-gap-audit.md) — inventarz wierszowy jest **wtórny** wobec gap-audit  
**Freeze α8:** [report-alpha8-code-freeze.md](./report-alpha8-code-freeze.md) — engineering zamknięty; PO smoke + CL-P0 → α9  
**Polityka werdyktów:** [ADR 0011](../../adr/0011-ui-parity-behavior.md)  
**Metodologia:** każdy wiersz zweryfikowany w kodzie (ścieżka); brak TBD.  
`requires-PO-smoke` = behawior z handlerów; potwierdzenie runtime u PO.

### Legenda

| Typ różnicy | Werdykt |
|-------------|---------|
| `color` \| `copy` \| `icon-vs-label` \| `layout` \| `spacing-density` \| `scale-zoom` \| `snap-quantize` \| `gesture` \| `tooltip` \| `disabled-state` \| `typography` \| `indicator-semantics` \| `missing` \| `extra-v5` | `bug` \| `port-behavior` \| `keep-v5-ds` \| `deferred` \| `out-forever` |

**Liczniki:** Timeline **57** · Admin **28** · Client **22** · **Razem 107**

---

## B1 — Timeline

### Header

| ID | Shell | Strefa | Element | v4 (fakt) | v5 (fakt) | Typ różnicy | Werdykt | Cytowania |
|----|-------|--------|---------|-----------|-----------|-------------|---------|-----------|
| TL-H-01 | Timeline | Header | Brand / wordmark | `StageSync Timeline` + ikona + `#app-version` | `ShellWordmark` suffix `Timeline` + `APP_VERSION` | layout | keep-v5-ds | `timeline/index.html` L54–61; `TimelineShell.tsx` L2212–2214 |
| TL-H-02 | Timeline | Header | Song cluster layout | `.timeline-header__song-center` w grid area controls, `justify-content: center` | `.songCluster` `justify-self: center` w grid `brand \| controls \| actions` | layout | keep-v5-ds | `timeline.css` L237–244, L377–381; `TimelineShell.module.css` L28–57 |
| TL-H-03 | Timeline | Header | Breakpoint ≤1100 | controls pod brand/actions | `@media (max-width: 1100px)` ta sama zamiana areas | layout | keep-v5-ds | `timeline.css` L341–346; `TimelineShell.module.css` L77–87 |
| TL-H-04 | Timeline | Header | ⓘ Metadane | `#btn-song-meta` ikona, tooltip „Metadane” | `ShellIconButton` „Metadane utworu” → `songMetaOpen` + inspector | gesture | keep-v5-ds | `index.html` L66–71; `TimelineShell.tsx` L2217–2230 |
| TL-H-05 | Timeline | Header | Prev / Next setlist | `#btn-song-prev` / `#btn-song-next` | chevron buttons + `navigate(/timeline/:id)` | gesture | keep-v5-ds | `index.html` L73–88; `TimelineShell.tsx` L2232–2254 |
| TL-H-06 | Timeline | Header | Song picker | `#btn-song-picker` + chevron + warn badges | `.songPicker` button → song screen overlay | layout | keep-v5-ds | `index.html` L78–84; `TimelineShell.tsx` L2239–2247 |
| TL-H-07 | Timeline | Header | Auto-setlista | `#btn-setlist-auto-advance` ikona | `ShellIconButton` Auto-setlista / `patchSetlistAutoAdvance` | gesture | keep-v5-ds | `index.html` L90–95; `TimelineShell.tsx` L2255–2271 |
| TL-H-08 | Timeline | Header | Undo / Redo | `#btn-undo` / `#btn-redo` ikony + tooltip ⌘Z/Y | `ShellIconButton` Cofnij/Ponów + draft history | icon-vs-label | keep-v5-ds | `index.html` L100–110; `TimelineShell.tsx` L2279–2291 |
| TL-H-09 | Timeline | Header | Odrzuć | `#btn-discard` **ikona** danger-outline | `ShellIconButton` + `IconDiscard` (RotateCcw) | icon-vs-label | **fixed** (2026-07-20) — wcześniej fałszywe `keep-v5-ds` bez decyzji PO | `index.html` L112–116; `TimelineShell.tsx` discard |
| TL-H-10 | Timeline | Header | Zapisz | `#btn-save` **ikona** amber + tooltip „Zapisz (⌘/Ctrl+S)” | `ShellIconButton` + `IconSave` + ⌘/Ctrl+S | icon-vs-label | **fixed** (2026-07-20) — wcześniej fałszywe `keep-v5-ds` | `index.html` L118–124; `TimelineShell.tsx` save |
| TL-H-11 | Timeline | Header | Pomoc | `#btn-help` glyph `?` | `ShellIconButton` + `IconHelp` | icon-vs-label | keep-v5-ds | `index.html` L126–128; `TimelineShell.tsx` L2303–2308 |
| TL-H-12 | Timeline | Header | Wygląd | `#btn-theme` sun/moon + panel Jasny/Wysoki kontrast | `ShellIconButton` + appearance overlay | copy | keep-v5-ds | `index.html` L129–154; `TimelineShell.tsx` L2310–2315 |
| TL-H-13 | Timeline | Header | Pełny ekran | `#btn-fullscreen` (często `hidden` do tier) | zawsze widoczny `ShellIconButton` | disabled-state | keep-v5-ds | `index.html` L156; `TimelineShell.tsx` L2317–2334 |
| TL-H-14 | Timeline | Header | App jump Admin/Klient | brak w headerze Timeline (osobne URL) | `<Link to="/admin">` / `<Link to="/">` | extra-v5 | keep-v5-ds | `TimelineShell.tsx` L2275–2278 |

### Toolbar — tools

| ID | Shell | Strefa | Element | v4 (fakt) | v5 (fakt) | Typ różnicy | Werdykt | Cytowania |
|----|-------|--------|---------|-----------|-----------|-------------|---------|-----------|
| TL-TO-01 | Timeline | Tools | Pointer | `id: pointer` w `TOOLS` | `id: "pointer"` | gesture | keep-v5-ds | `timeline-tools.js` L9–14; `TimelineShell.tsx` L212–217 |
| TL-TO-02 | Timeline | Tools | Smart Tool | **brak** w tool strip | `id: "smart"` — strefy move/trim | extra-v5 | keep-v5-ds | `TimelineShell.tsx` L218–223; v4 `timeline-tools.js` L8–52 (brak smart) |
| TL-TO-03 | Timeline | Tools | Pencil | `id: pencil` | `id: "pencil"` | gesture | keep-v5-ds | `timeline-tools.js` L16–20; `TimelineShell.tsx` L224–228 |
| TL-TO-04 | Timeline | Tools | Eraser | `id: eraser` | `id: "eraser"` | gesture | keep-v5-ds | `timeline-tools.js` L22–26; `TimelineShell.tsx` L230–234 |
| TL-TO-05 | Timeline | Tools | Scissors | `id: scissors` | `id: "scissors"` (Forma+content+mapy) | gesture | deferred | `timeline-tools.js` L28–32; `TimelineShell.tsx` L236–241; TODO Kotwice/scissors smoke |
| TL-TO-06 | Timeline | Tools | Zoom tool | aktywny drag prostokąt | **usunięte** z strip — zoom tylko suwaki H/V/UI + Ctrl/Meta+wheel | missing | out-forever | v4 `timeline-tools.js` L34–38; v5 brak wpisu w `TOOLS` |
| TL-TO-07 | Timeline | Tools | Różdżka | `id: wand` + menu | `id: "wand"` + `WAND_ACTIONS` | gesture | keep-v5-ds | `timeline-tools.js` L40–44, L59+; `TimelineShell.tsx` L250–262, L2351–2364 |
| TL-TO-08 | Timeline | Tools | Tap | `toolbar: false` — przy dock Tekst | Tap przy etykiecie Tekst (dock), nie na strip | layout | keep-v5-ds | `timeline-tools.js` L46–51; `TimelineShell.tsx` ~L2600; Help `TimelineHelp.tsx` |

### Transport / BBT / status

| ID | Shell | Strefa | Element | v4 (fakt) | v5 (fakt) | Typ różnicy | Werdykt | Cytowania |
|----|-------|--------|---------|-----------|-----------|-------------|---------|-----------|
| TL-T-01 | Timeline | Transport | Stop | `#btn-transport-stop` ikona | `ShellIconButton` Zatrzymaj | gesture | keep-v5-ds | `index.html` L269–270; `TimelineShell.tsx` L2369–2374 |
| TL-T-02 | Timeline | Transport | Play/Pause | `#btn-transport-play` amber icon | `.playBtn` primary border | color | keep-v5-ds | `index.html` L272–274; `TimelineShell.module.css` L143–154 |
| TL-T-03 | Timeline | Transport | Loop toggle | `#btn-transport-loop` + toast bez regionu | pressed + tooltip „przeciągnij zakres…” | tooltip | keep-v5-ds | `index.html` L276; `TimelineShell.tsx` L2387–2392; v4 `toggleLoop` L2043–2055 |
| TL-T-04 | Timeline | Transport | BBT readout | `#transport-bar` / `#transport-beat` w `.tl-transport-info` | `.bbt` `{bar}.{beat}` | typography | keep-v5-ds | `index.html` L284–287; `TimelineShell.tsx` L2394–2396 |
| TL-T-05 | Timeline | Transport | Tempo / Metrum / Tonacja | przyciski w **wyśrodkowanym** `__center` | `.toolbarCenter` (tools \| center transport+BBT+meta \| right) | layout | **fixed** (2026-07-20) | `timeline.css` L1235–1242; `TimelineShell.tsx` toolbar; `.toolbar` grid |
| TL-T-06 | Timeline | Transport | Metronom | `#btn-metronome` w **center** koło transport | `ShellIconButton` w `.toolbarCenter` (po meta) | layout | **fixed** (2026-07-20) — było w `.toolbarRight`; audyt nie złapał placement | `index.html` L293–299; `TimelineShell.tsx` transport cluster |
| TL-T-07 | Timeline | Transport | Follow | `#btn-follow-playhead` w **center** | `ShellIconButton` w `.toolbarCenter` | layout | **fixed** (2026-07-20) — było w `.toolbarRight` | `timeline.js` L26; `TimelineShell.tsx` |
| TL-T-08 | Timeline | Status | Dirty badge | `#dirty-badge` „Niezapisane zmiany” w right | `.dirty` w `.toolbarRight` | copy | keep-v5-ds | `index.html` L315; `TimelineShell.tsx` |
| TL-T-09 | Timeline | Status | Live / conn badge | `#live-badge` „Live playhead” | brak równoważnego badge w chrome | missing | deferred | `index.html` L358 |
| TL-T-10 | Timeline | Status | Footer info | conn-dot + zoom (bez Utwór/Pozycja/Stan) | było Admin-like Utwór/Pozycja/Połączenie/Stan — **dublowanie** | layout | **fixed** (2026-07-20) — bez decyzji PO; przywrócono v4: dot+label + zooms | v4 `index.html` L352–372; `TimelineShell.tsx` footer |
| TL-T-11 | Timeline | Input | Ctrl/Meta+wheel | `onTimelineWheel` → H zoom @ anchor | `wheel` `{passive:false}` na `[data-canvas-scroll]` | gesture | **fixed** (2026-07-20) | v4 `timeline.js` L4837+; `TimelineShell.tsx` |
| TL-T-12 | Timeline | Input | Skróty Space/K/C/S/Z/←→ | transport, metro, loop, save, fit, nudge | port core shortcuts | gesture | **fixed** (2026-07-20) — wcześniej tylko ⌘Z + Delete | v4 `timeline.js` L9626+ |
| TL-T-13 | Timeline | Canvas | Marquee multi-select | drag empty → prostokąt zaznaczenia | brak (single-select) | missing | port-behavior | v4 marquee; `TimelineShell.tsx` |
| TL-T-14 | Timeline | Canvas | Bar grid visibility | `.timeline-bar-grid__line` ~25% border | `.barLine` contrast bump (było łatwo „zniknąć”) | color | **fixed** (2026-07-20) — grid istniał; czytelność | v4 `timeline.css` L2287+; `TimelineShell.module.css` |

### Ruler / markers / snap (seed)

| ID | Shell | Strefa | Element | v4 (fakt) | v5 (fakt) | Typ różnicy | Werdykt | Cytowania |
|----|-------|--------|---------|-----------|-----------|-------------|---------|-----------|
| TL-R-01 | Timeline | Ruler | Bar numbers | ticks z `renderRuler` | `buildRulerBarMarks` / labels | layout | keep-v5-ds | `timeline.js` ~L6665; `formaCanvas.ts` / `TimelineShell.tsx` ruler map |
| TL-R-02 | Timeline | Ruler | Beat ticks | gdy `pxb >= 56` | `RULER_BEAT_TICKS_MIN_PX = 56` | scale-zoom | keep-v5-ds | `timeline.js` L6665; `formaCanvas.ts` L21–24, L200–201 |
| TL-R-03 | Timeline | Ruler | Locator seek snap | `setLocatorAbsBeat` → **`quantizeAbsBeat`** (beat) | `placeLocatorAtTicks` → **`snapEditTicks(..., "beat")`** (+ Cmd/Ctrl off) | snap-quantize | **fixed** (2026-07-20) | `timeline.js` L6918–6928; `TimelineShell.tsx` `placeLocatorAtTicks`; `formaCanvas.ts` |
| TL-R-04 | Timeline | Ruler | Loop range snap | `setLoopRangeFromAbs` → **`quantizeAbsBeat`** | `snapLoopRange` → `snapEditTicks(..., "beat")` | snap-quantize | **fixed** (2026-07-20) | `timeline.js` L2067–2073; `timelineLocator.ts`; `TimelineShell.tsx` |
| TL-R-05 | Timeline | Ruler | Loop drag gesture | drag na ruler → region; click in-loop toggle | `onLocatorPointerDown/Move/Up` + 5px threshold; toggle in-region | gesture | keep-v5-ds | `TimelineShell.tsx` L1527–1597; v4 loop handlers + help |
| TL-R-06 | Timeline | Markers | Locator color | `--ss-accent` (żółty/amber) + shadow | `--ss-color-primary` (locator) | color | **fixed** (2026-07-20) | `timeline.css` L2833–2868; `TimelineShell.module.css` `.locator`; ADR 0011 §3/§5 |
| TL-R-07 | Timeline | Markers | Playhead (MIDI/live) color | `--ss-active` (cyjan) | `.playheadMidi` → `--ss-color-info` | indicator-semantics | **fixed** (2026-07-20) | `timeline.css` L2809–2830; `TimelineShell.module.css` `.playheadMidi` |
| TL-R-08 | Timeline | Markers | Playhead visibility | cyan przy MIDI/`beat_tick`; yellow przy local play | `showMidiPlayhead = false` (Timeline owns play; MIDI overlay → β2); locator follows play | indicator-semantics | **fixed** (2026-07-20) | `timeline.js` L200–201, L509–512; `TimelineShell.tsx` |
| TL-R-09 | Timeline | Markers | Locator hit target | full-height `bottom: 0` | hit tylko wysokość ruler; rail `pointer-events: none` | gesture | keep-v5-ds | `timeline.css` L2834–2844; `TimelineShell.module.css` L342–366 |

### Canvas / dock / eye

| ID | Shell | Strefa | Element | v4 (fakt) | v5 (fakt) | Typ różnicy | Werdykt | Cytowania |
|----|-------|--------|---------|-----------|-----------|-------------|---------|-----------|
| TL-C-01 | Timeline | Dock | Lane order | Tempo→Tonacja→Metrum→Kotwice→Forma→… | ta sama kolejność specjalne nad treścią (α4+) | layout | keep-v5-ds | dock render TimelineShell; ADR 0011 P0 |
| TL-C-02 | Timeline | Dock | Eye menu | per-ślad visibility | eye menu per track | gesture | keep-v5-ds | `TimelineShell.tsx` L2507–2517 |
| TL-C-03 | Timeline | Dock | Tap on Tekst | przy lane Tekst | Tap button w dock Tekst | layout | keep-v5-ds | `timeline-tools.js` L50–51; TimelineShell dock Tap |
| TL-C-04 | Timeline | Canvas | Forma edit snap | `snapAbsToBarStart` | `snapEditTicks` bar + Cmd/Ctrl off | snap-quantize | keep-v5-ds | ADR 0007; `formaCanvas.ts` L232–235 |
| TL-C-05 | Timeline | Canvas | Content overwrite | cover-delete finalize | `insertSpanOverwrite` path | gesture | keep-v5-ds | parity-blocker; Forma/content handlers |
| TL-C-06 | Timeline | Canvas | Audio lanes | widoczne | ukryte do β2 | missing | out-forever | ROADMAP β2; TODO OUT |

### Inspector / metadata (seed)

| ID | Shell | Strefa | Element | v4 (fakt) | v5 (fakt) | Typ różnicy | Werdykt | Cytowania |
|----|-------|--------|---------|-----------|-----------|-------------|---------|-----------|
| TL-M-01 | Timeline | Meta | Ścieżka ⓘ | `openSongMetaInspector` → form | ⓘ → `songMetaOpen` + inspector | gesture | keep-v5-ds | `timeline.js` L4601–4607; `TimelineShell.tsx` L2217–2227 |
| TL-M-02 | Timeline | Meta | Tytuł | `#meta-title` | input `draftProject.name` | copy | keep-v5-ds | `timeline.js` L6140–6141; `TimelineShell.tsx` L2731–2743 |
| TL-M-03 | Timeline | Meta | Artysta / Gatunek | `#meta-artist` / `#meta-genre` | artist / genre inputs | copy | keep-v5-ds | `timeline.js` L6144–6149; `TimelineShell.tsx` L2789–2813 |
| TL-M-04 | Timeline | Meta | Rok wydania | `#meta-year` | pole `year` w inspectorze | missing | **fixed** (2026-07-20) | `timeline.js` L6152–6153; `TimelineShell.tsx` song meta |
| TL-M-05 | Timeline | Meta | PC | `#meta-pc` | PC (MIDI) number; disabled gdy template | copy | keep-v5-ds | `timeline.js` L6156–6157; `TimelineShell.tsx` L2769–2787 |
| TL-M-06 | Timeline | Meta | Tempo | `#meta-tempo` editable + varying suffix | `defaultBpm` editable | copy | keep-v5-ds | `timeline.js` L6160–6161; `TimelineShell.tsx` L2745–2760 |
| TL-M-07 | Timeline | Meta | Metrum | `#meta-time` **editable** text | `defaultMeter` editable (+ `meterMap` @ 0) | disabled-state | **fixed** (2026-07-20) | `timeline.js` L6164–6165; `TimelineShell.tsx` song meta |
| TL-M-08 | Timeline | Meta | Tonacja | `#meta-tonic` + `#meta-mode` editable | tonic/mode selects → `keyMap` @ 0 | disabled-state | **fixed** (2026-07-20) | `timeline.js` L6168–6178; `TimelineShell.tsx` song meta |
| TL-M-09 | Timeline | Meta | ID utworu | pole static ID | brak | missing | deferred | `timeline.js` L6136–6137 |
| TL-M-10 | Timeline | Meta | Okładka URL | `#meta-cover` + preview | brak | missing | deferred | `timeline.js` L6181–6185 |

### Help / zoom / touch

| ID | Shell | Strefa | Element | v4 (fakt) | v5 (fakt) | Typ różnicy | Werdykt | Cytowania |
|----|-------|--------|---------|-----------|-----------|-------------|---------|-----------|
| TL-P-01 | Timeline | Help | Panel size | `width: min(72rem,…)` `max-height: min(92vh, 56rem)` | `.helpOverlayPanel` `72rem` / `56rem` | layout | keep-v5-ds | `timeline.css` L3230–3236; `TimelineShell.module.css` L1188–1190 |
| TL-Z-01 | Timeline | Zoom | Zoom H | `state.pxPerBar`; effective × UI scale | `effectiveZoomH = zoomH * uiScale` | scale-zoom | **fixed** (2026-07-20) | `timeline.js` L4621–4624; `TimelineShell.tsx` |
| TL-Z-02 | Timeline | Zoom | Zoom V | `--tl-lane-height` = lane × UI scale | `--tl-row-h: ${effectiveZoomV}px` | scale-zoom | **fixed** (2026-07-20) | `timeline.js` L4627–4644; `TimelineShell.tsx` |
| TL-Z-03 | Timeline | Zoom | Zoom UI | `--tl-ui-scale` mnoży H + lane + chrome fonts | `--tl-zoom-ui` chrome + effective H/V | scale-zoom | **fixed** (2026-07-20) | `timeline.js` L4631–4636; `TimelineShell.module.css` / shell |
| TL-Z-04 | Timeline | Zoom | Range accent | `--ss-accent` | `accent-color: var(--ss-color-primary)` | color | keep-v5-ds | parity-blocker; Timeline zoom sliders |
| TL-X-01 | Timeline | Touch | `data-tl-tier` | `html[data-tl-tier]` mobile RO / tablet nudge | `data-tl-tier={touchTier}` + nudge | gesture | keep-v5-ds | `timeline-touch.js` / CSS; `TimelineShell.tsx` L2210, L3224+ |
| TL-X-02 | Timeline | Touch | Mobile inspector sheet | `is-meta-sheet-open` | tiers CSS `.shell[data-tl-tier=…]` | layout | keep-v5-ds | `timeline.css` mobile; `TimelineShell.module.css` L1151+ |

---

## B2 — Admin

| ID | Shell | Strefa | Element | v4 (fakt) | v5 (fakt) | Typ różnicy | Werdykt | Cytowania |
|----|-------|--------|---------|-----------|-----------|-------------|---------|-----------|
| AD-N-01 | Admin | Chrome | Nawigacja sekcji | jedna strona scroll (Live Desk + lista) | taby `Utwory\|Set\|Scena\|Pliki\|Host` | layout | keep-v5-ds | `admin/index.html` L130+; `AdminShell.tsx` L47–52 |
| AD-N-02 | Admin | Chrome | Brand / version | `StageSync Admin` + `#app-version` | `ShellWordmark` + version | layout | keep-v5-ds | `admin/index.html` L48–49; AdminShell header |
| AD-N-03 | Admin | Chrome | Jump Timeline / Klient | linki amber-outline z ikonami | Linki w headerze | icon-vs-label | keep-v5-ds | `admin/index.html` L56–70; AdminShell |
| AD-N-04 | Admin | Chrome | Wygląd | Jasny motyw + Wysoki kontrast | Appearance panel DS | copy | keep-v5-ds | `admin/index.html` L90–104 |
| AD-S-01 | Admin | Status | Teraz | Live Desk „Utwór” + sekcja/pozycja | `statusLab` Teraz + nazwa z `activeProjectId` | layout | keep-v5-ds | `admin/index.html` L148–161; `AdminShell.tsx` L360+ |
| AD-S-02 | Admin | Status | Dalej / następny | `state-setlist-next` | `statusLab` Dalej + setlist next | copy | keep-v5-ds | `admin/index.html` L163–169; `AdminShell.tsx` L388+ |
| AD-S-03 | Admin | Status | Conn indicator | `#live-state-connection` | `wsStatus` w chrome | indicator-semantics | keep-v5-ds | `admin/index.html` L136–144 |
| AD-S-04 | Admin | Status | MIDI / Timeline btn | działający mostek MIDI | **removed** (2026-07-20) — brak atrapy w footer; Host MIDI → β2 | disabled-state | **out-forever** (chrome) | było `AdminShell.tsx` footer; gap-audit AD-05 |
| AD-S-05 | Admin | Status | Transpozycja | `#global-transpose` aktywny (Live Desk) | **removed** — brak UI do β2 (API ABSENT) | missing | **out-forever** (chrome stub); feature → deferred β2 | gap-audit AD-01 |
| AD-S-06 | Admin | Status | Sync-lead | `#global-sync-lead` aktywny | **removed** — brak UI do β2 | missing | **out-forever** (chrome stub); feature → deferred β2 | gap-audit AD-02 |
| AD-S-07 | Admin | Status | Edycja zdalna | `#client-edit-enabled` | **removed** — brak UI do β2 | missing | **out-forever** (chrome stub); feature → deferred β2 | gap-audit AD-03 |
| AD-U-01 | Admin | Utwory | Lista + filtr | song list + search | card Utwory + filter/sort | layout | keep-v5-ds | `AdminShell.tsx` L652+ |
| AD-U-02 | Admin | Utwory | PC / Batch PC | batch w 4.x | Batch PC modal | gesture | keep-v5-ds | `AdminShell.tsx` L712 |
| AD-U-03 | Admin | Utwory | Ostrzeżenia PC | badge jak song-list-warn | ostrzeżenia w liście | indicator-semantics | keep-v5-ds | v4 admin song list; AdminShell rows |
| AD-U-04 | Admin | Utwory | Export / Import | pliki bazy | przyciski Export/Import | gesture | keep-v5-ds | `AdminShell.tsx` L667–670 |
| AD-SET-01 | Admin | Set | Setlista vs lista | „Dodaj zaznaczone z listy” (osobna lista poniżej) | `SetView`: pickIds + „Dodaj zaznaczone” **na tej samej zakładce** | layout | keep-v5-ds | `admin/index.html` L197–198; `SetView.tsx` L18–27, L238 |
| AD-SET-02 | Admin | Set | Auto-setlista | switch w setlist module | switch w SetView | gesture | keep-v5-ds | `admin/index.html` L187–192; SetView |
| AD-SET-03 | Admin | Set | Włącz setlistę | `#setlist-enabled` | enabled draft + Zapisz | gesture | keep-v5-ds | `admin/index.html` L183–185; SetView |
| AD-ST-01 | Admin | Scena | Komunikaty live | session-messages panel | `StageView` | layout | keep-v5-ds | `admin/index.html` L278+; `StageView.tsx` |
| AD-F-01 | Admin | Pliki | Pliki projektu | ścieżki / empty | `ProjectFilesPanel` + import | layout | keep-v5-ds | `AdminShell.tsx` L921+ |
| AD-F-02 | Admin | Pliki | Audio playback | n/a w admin desk | brak silnika | missing | out-forever | → β2 |
| AD-H-01 | Admin | Host | Restart | `#btn-system-restart` header | Host tab Restart (2×) | gesture | keep-v5-ds | `admin/index.html` L113; `AdminShell.tsx` L1006–1055 |
| AD-H-02 | Admin | Host | Shutdown | `#btn-system-shutdown` | Host shutdown | gesture | keep-v5-ds | `admin/index.html` L119 |
| AD-H-03 | Admin | Host | Logi | logi serwera | SSE Host logs + clear | gesture | keep-v5-ds | `AdminShell.tsx` HostView L992+ |
| AD-H-04 | Admin | Host | MIDI I/O | pełny UI MIDI 4.x | stub „Host MIDI I/O — β2” | disabled-state | out-forever | `AdminShell.tsx` L1113–1118 |
| AD-H-05 | Admin | Host | Update / Docker | historycznie update UI | disabled „ADR 0004 — Docker” | disabled-state | out-forever | `AdminShell.tsx` L1140–1143; ADR 0004 |
| AD-H-06 | Admin | Host | Ustawienia .env | `#btn-server-settings` | `HostSettingsModal` (MIDI fieldset disabled) | disabled-state | deferred | `admin/index.html` L107; `AdminShell.tsx` L1166–1197 |
| AD-IA-01 | Admin | IA | Gęstość ekranów | duże karty Tailwind | mniejsze card surfaces DS | spacing-density | keep-v5-ds | ADR 0011; AdminShell.module.css |

---

## B3 — Client

| ID | Shell | Strefa | Element | v4 (fakt) | v5 (fakt) | Typ różnicy | Werdykt | Cytowania |
|----|-------|--------|---------|-----------|-----------|-------------|---------|-----------|
| CL-W-01 | Client | Welcome | Role tiles icons | emoji 🎤🎹🎼🥁 | **te same** emoji w `ROLES.icon` | icon-vs-label | keep-v5-ds | `client/index.html` L174–190; `ClientShell.tsx` L37–61 |
| CL-W-02 | Client | Welcome | Tile color hover | cyan/amber/emerald/orange per rola | selected/`primary` — bez tęczy statusu | color | keep-v5-ds | `client/index.html` L174–189; ADR 0011 §5; ClientShell.module.css |
| CL-W-03 | Client | Welcome | Copy ról | Tekst / Akordy / Partytura / Forma | te same labele + blurb | copy | keep-v5-ds | `ClientShell.tsx` L37–61 |
| CL-W-04 | Client | Welcome | Dual role | max 2 role | `picked.length` max 2 + „widok dzielony” | gesture | keep-v5-ds | `ClientShell.tsx` L270–314 |
| CL-W-05 | Client | Welcome | Rozpocznij CTA | start po wyborze | `Button` primary disabled gdy 0 | copy | keep-v5-ds | `ClientShell.tsx` L305–314 |
| CL-W-06 | Client | Welcome | Name modal | imię klienta | name modal + change pencil | gesture | keep-v5-ds | `ClientShell.tsx` L204+, L244–268 |
| CL-H-01 | Client | Header | Brand home | `#btn-app-home` StageSync | `ClientHeader` wordmark / home | layout | keep-v5-ds | `client/index.html` L77–80 |
| CL-H-02 | Client | Header | Connection | `#connection-indicator` + red/green dot | `wsStatus` w headerze | indicator-semantics | keep-v5-ds | `client/index.html` L83–86 |
| CL-H-03 | Client | Header | Song title | `#song-title` | active project name | copy | keep-v5-ds | `client/index.html` L91 |
| CL-H-04 | Client | Header | Section / BBT | `#section-label` + metronome header | BBT + section z transportu | layout | keep-v5-ds | `client/index.html` L82–94; ClientHeader |
| CL-H-05 | Client | Header | vs treść | header gęsty | header wtórny wobec stage (ADR 0011) | spacing-density | keep-v5-ds | ADR 0011; ClientShell stage |
| CL-R-01 | Client | Role | Karaoke treść | linie + beat highlight | karaoke pane + transport | gesture | keep-v5-ds | `client.js` karaoke; `ClientShell.tsx` L404+ |
| CL-R-02 | Client | Role | Grid akordów | `grid-cycle.js` | grid pane + prefs | gesture | keep-v5-ds | `ClientShell.tsx` L439+ |
| CL-R-03 | Client | Role | Forma / drums | `drums-view.js` | drums pane z forma clips | gesture | keep-v5-ds | `ClientShell.tsx` L368+ |
| CL-R-04 | Client | Role | Score / OSMD | `score-view.js` + OSMD CDN | partial / stub sync | missing | deferred | `client/index.html` L45; ROADMAP |
| CL-R-05 | Client | Role | Stage cue overlay | cue-display | `stageCue` filter po rolach | gesture | keep-v5-ds | `ClientShell.tsx` L118–120 |
| CL-D-01 | Client | Settings | Karaoke: skala tekstu | range text scale | „Skala tekstu (%)” | copy | keep-v5-ds | `ClientShell.tsx` L614–634 |
| CL-D-02 | Client | Settings | Karaoke: Auto-scroll | switch | `ShellSwitchRow` Auto-scroll | copy | keep-v5-ds | `ClientShell.tsx` L636–651 |
| CL-D-03 | Client | Settings | Karaoke: Tap wokalu | vocal tap | „Tap wokalu” + hint Space | copy | keep-v5-ds | `ClientShell.tsx` L653–662 |
| CL-D-04 | Client | Settings | Grid: H zamiast B | hybrid Polish B | „H zamiast B” | copy | keep-v5-ds | `ClientShell.tsx` L670–678 |
| CL-D-05 | Client | Settings | Grid: Litery / Animacje | quality + animations | „Litery zamiast symboli” / „Animacje” | copy | keep-v5-ds | `ClientShell.tsx` L680–698 |
| CL-D-06 | Client | Settings | Global settings | `#global-settings-panel` | global gear panel | layout | keep-v5-ds | `client/index.html` L96–100; `ClientShell.tsx` L546+ |

---

## Top dla PO (z aneksu)

### `bug` / `port-behavior` (priorytet smoke)

| ID | Temat | Werdykt |
|----|-------|---------|
| **TL-R-03** | Locator/seek snap @ beat (+ Cmd off) | **fixed** (2026-07-20) |
| **TL-R-04** | Loop snap @ beat | **fixed** (2026-07-20) |
| **TL-R-06 / TL-R-07** | Locator `primary` vs playhead `info` | **fixed** (2026-07-20) |
| **TL-R-08** | Playhead visibility (no line on pause; MIDI → β2) | **fixed** (2026-07-20) |
| **TL-T-05** | BBT/transport cluster centered | **fixed** (2026-07-20) |
| **TL-Z-01…03** | Zoom UI multiplies H/V | **fixed** (2026-07-20) |
| **TL-M-04 / 07 / 08** | Meta year + editable meter/key @ 0 | **fixed** (2026-07-20) |
| **TL-H-09/10** | Odrzuć/Zapisz **ikony** (nie label) | **fixed** (2026-07-20) — fałszywe `keep-v5-ds` |
| **TL-T-06/07** | Metronom + Follow w **center** | **fixed** (2026-07-20) |
| **TL-T-10** | Footer bez dublowania Utwór/Pozycja/… | **fixed** (2026-07-20) |
| **TL-T-11/12** | Ctrl+wheel + skróty Space/K/C/S… | **fixed** (2026-07-20) |
| **TL-T-13** | Marquee multi-select | **port-behavior** (otwarte) — gap-audit TE-01 |
| **TL-T-14** | Bar grid czytelność | **fixed** (2026-07-20) |
| **AD-S-04…07** | Footer MIDI/Tr./Lead/Edycja stubs | **removed** (2026-07-20) — out-forever chrome |

### Świadome `keep-v5-ds` / `out-forever` (nie blokują samym chrome)

- TL-TO-02 Smart Tool extra  
- AD-H-04/05 MIDI + Docker update OUT  
- AD-S-04…07 footer korekt/MIDI — **removed** (brak UI do β2)  
- CL-W-02 bez tęczy hover ról  

> **Korekta metodologii:** `keep-v5-ds` ≠ domyślna ucieczka agenta. Luki zachowania (marquee, clipboard, CD) → [gap-audit](./report-v4-v5-gap-audit.md), nie „OUT inventarza”.

---

## Cross-link

**SSOT luk:** [report-v4-v5-gap-audit.md](./report-v4-v5-gap-audit.md).  
Bramka: [report-parity-blocker-alpha8.md](./report-parity-blocker-alpha8.md).  
Część A: [report-v4-v5-parity-audit.md](./report-v4-v5-parity-audit.md).
