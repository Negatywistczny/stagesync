# StageSync v5 — TODO

**Stan:** `5.0.0-alpha.8` (working tree) — **faza rebuild** wg [ADR 0011](./adr/0011-ui-parity-behavior.md).  
Historia: [CHANGELOG.md](../CHANGELOG.md). Kolejne etapy: [ROADMAP.md](./ROADMAP.md).

**Zakaz β:** [report-parity-blocker-alpha8.md](./analysis/reports/report-parity-blocker-alpha8.md) — **bez** `beta.1` / tagu β, dopóki **PO smoke** (zachowanie, nie inventarz) + CI nie są green.

## Procedura zamykania etapu

Przy tagu `v5.0.0-alpha.N` (analogicznie `beta.N`, `5.0.0`):

1. Przenieś zrealizowane pozycje do [CHANGELOG.md](../CHANGELOG.md).
2. **Wyczyść całą checklistę** w tym pliku — bez starych sekcji i odhaczonych bulletów.
3. Zastąp plik **wyłącznie** sekcją kolejnego etapu (nagłówek, link do scope report, must/should/release).
4. Zaktualizuj `**Stan:**` na górze.

## Rebuild alpha — parity behawioralna (przed β)

Hero: **przywrócić workflow v4 jako zachowanie** w spójnym UI v5 (nie clone chrome, nie odhaczanie inventarza).  
Kontrakt: [ADR 0011](./adr/0011-ui-parity-behavior.md). Bramka: [parity-blocker](./analysis/reports/report-parity-blocker-alpha8.md).

> **Reset statusu:** wcześniejsze `[x]` „engineering wired / inventarz done” **nie liczą się**. Done = green **PO smoke** na geście / flow.

### Must — P0 Timeline (sterowanie + canvas)

Referencja v4: `STAGESYNC-APP-LEGACY` `timeline.js` / `timeline.css` / `song-maps.js`.  
Audyt luk: [parity-blocker](./analysis/reports/report-parity-blocker-alpha8.md).

- [x] **Grid:** barlines z `meterMap` (jak `iterBarBoundaries`); ruler **beat ticks** gdy px/bar ≥ 56
- [x] **Zoom V + UI:** naprawdę zmieniają wysokość lane / skalę chrome (nie tylko H); `accent-color: primary` na range
- [x] Forma: move / resize / pencil + **snap do miar taktu** — smoke (zoom ≠ default + scroll)
- [x] Tekst / Akordy / Cue: move / resize / pencil + overwrite — j.w.
- [x] **Mapy Tempo / Metrum / Tonacja** — poziom SongMaps v4
- [ ] Locator / scrub / follow / loop region + transport SSOT
- [x] Hit zones, gesturePreview, Cmd/Ctrl = snap off — smoke
- [ ] Kotwice + scissors — smoke
- [x] Header: song cluster **wyśrodkowany**; reguła wąskiego breakpointu (v4 ≤1100 — nie flex-only L/R)
- [x] Help: proporcje jak v4 (szeroki panel, bez konfliktu min-width)
- [x] Metadane: ścieżka ⓘ → sheet działa; pola jak v4 (title/artist/… w inspectorze)
- [x] Playhead / loop: bez cyan/`info` jako „marki” — primary / selected

### Must — P0 Client (treść ról)

- [x] Karaoke / grid akordów / Forma notes = **treść sceniczna**, nie suchy tekst
- [x] Header wtórny wobec treści stage (nie odwrotnie)
- [x] Role wired z transportem + kontekstem projektu (smoke na żywej roli)

### Must — P0 Admin (IA)

- [x] **Set + wybór utworów w jednym flow** (bez „zaznacz na innej zakładce”)
- [x] Mniejsze powierzchnie ekranów (mniej „ścian” kontrolek)
- [ ] Podział zakładek intuicyjny względem workflow live desk

### Must — proces / bramka

- [ ] Inventarz aktualizowany **po** działającym geście ([ui-shell-inventory.md](./ui-shell-inventory.md) — wtórny)
- [ ] Zakaz zamykania PR słowami *wired* / *partial* / *engineering ready* bez ścieżki PO smoke
- [ ] CI: `pnpm lint && check-types && test && build`
- [ ] **PO smoke** green ([report-qa-signoff-alpha8.md](./analysis/reports/report-qa-signoff-alpha8.md) + ADR 0011)
- [ ] **Zakaz** bumpa / tagu `5.0.0-beta.*` do sign-off PO

### Should

- [ ] E2E smoke: Forma drag + transport
- [x] Zoom tool drag-H (albo wyłączyć do czasu implementacji)
- [x] Tablet/mobile tiers (`data-tl-tier` logika z v4 — RO mobile, nudge tablet)
- [ ] Inspector podsekcji Formy — jeśli nie w P0 canvas
- [ ] α9 migrator: utrzymanie MVP + fixtures (nie blokuje rebuild UI)

### OUT (świadome — nie blokują parity gate)

- git-apply / „Zaktualizuj teraz” — [ADR 0004](./adr/0004-updates-docker.md)
- Audio tracks — lane UI ukryte; playback / gain / mute — **β2**
- Docker-as-update / Tauri — **β1** (po parity + PO)
- Host MIDI I/O — **β1**
- Pełny OSMD sync — stub OK
- Clone chrome v4 „dla parity” — **zakaz** ([ADR 0011](./adr/0011-ui-parity-behavior.md))

### Release

- [ ] Tylko po PO smoke; bump/tag wyłącznie na prośbę
- [ ] TODO → β1 **dopiero** po rebuild P0 + PO
