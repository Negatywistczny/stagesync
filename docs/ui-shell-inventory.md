# Inventarz kontrolek UI (v4 → v5 shelle)

**Rola:** checklista **wtórna** — aktualizuj **po** działającym geście / flow, nie przed.  
Parity = **zachowanie** ([ADR 0011](./adr/0011-ui-parity-behavior.md)), nie „jest przycisk”.  
Layout paneli = **nowy** ([ADR 0003](./adr/0003-ui-direction-booth.md)); paleta black/amber; **zakaz** clone chrome z 4.x.

`[x]` poniżej = „kontrolka istnieje w shellu” — **nie** = green PO smoke. Usunięcie bez „Świadome delty” = blocker dopiero gdy zachowanie jest w scope.

**β gate:** [report-parity-blocker-alpha8.md](./analysis/reports/report-parity-blocker-alpha8.md) — **zakaz β** do green PO smoke (świadome OUT poniżej).  
**SSOT luk:** [report-v4-v5-gap-audit.md](./analysis/reports/report-v4-v5-gap-audit.md).  
**Audyt UI-diff:** [report-v4-v5-ui-diff-inventory.md](./analysis/reports/report-v4-v5-ui-diff-inventory.md).

### Reguła: brak funkcji = brak UI

**Zakaz** umieszczania `disabled` kontrolek w status/toolbar „na zapas” (inventarz-first).  
Tr./Lead/Edycja zdalna / MIDI bridge → **β2** bez chrome stub; wrócą dopiero z API + Live Desk.

## Świadome delty v5 (pozostałe OUT)

| Delta | Uwagi |
|-------|--------|
| Audio lane / + Audio w Timeline | **Ukryte** do β2 (schema v3 `audioTracks`/`audioClips` zostaje); playback / gain / mute → **β2** |
| Countdown widoczny; długość = pre-roll ≤ 0 | Semantyka v5 |
| − git-apply / „Zaktualizuj teraz” | [ADR 0004](./adr/0004-updates-docker.md) — **nigdy** |
| SPA: linki Admin → `/timeline`, `/` | Bez labowego ShellNav |
| React + CSS Modules + `--ss-*` | Stack v5 |
| Admin: Utwory · Set · Scena · Host | IA v5 — **Set + wybór utworów w jednym flow** ([ADR 0011](./adr/0011-ui-parity-behavior.md)); import paczki pod Wybrany; bez „zaznacz na innej zakładce” |
| Host MIDI I/O + meters + Tr./Lead/Edycja zdalna | **β2** (z audio; β1 = host bez MIDI) — **bez** disabled chrome stub |
| Pełny OSMD sync playhead→nuty | Stub OK; upload MusicXML = wired |
| Client: tonacja koncertowa / polskie nazwy sekcji | Should (później) |
| Paczka `.stagesync` | MVP JSON (`.stagesync.json`) — bez zip/archiver legacy |
| Backup restore / path picker FS | Placeholder (path picker shell) |
| Forma scissors = subsections v4 | v5: insert + drag granic + select + 4-bar fill + **inspector list / + / ×** |

## Timeline — wymagania layoutu (parity v4, α4+)

1. **Jedna siatka wierszy:** nagłówek ścieżki (dock) i lane canvas w **tym samym wierszu**.
2. **Kolejność pionowa:** Tempo → Tonacja → Metrum → Kotwice → Forma → Tekst → Akordy → Cue (Audio → β2).
3. **Eye menu:** ukrywanie pojedynczych śladów; Forma zawsze widoczna.
4. **Responsywność:** węższe okno nie rozdziela nagłówków od lane’ów.

## Timeline

### Tools

- [x] `smart` / `pointer` / `pencil` / `eraser` / `scissors` (Forma + Tekst/Akordy/Cue)
- [x] Zoom — suwaki H/V/UI w statusie (+ Ctrl/Meta+wheel); **bez** narzędzia lupy na pasku
- [ ] `gain` / `mute` — β2
- [x] `wand` + menu
- [x] `tap` na docku Tekst (tempo)

### Header / transport

- [x] Brand, Metadane (tytuł, defaultBpm, PC, artysta, gatunek, tonacja)
- [x] Setlista ← / picker / → · Auto-setlista
- [x] Undo / Redo / Odrzuć / Zapisz · Pomoc · Wygląd · Pełny ekran
- [x] Stop / Play · Loop (region + server SSOT) · BBT · Tempo / Metrum / Tonacja edit @ playhead
- [x] Metronom · Follow playhead · Dirty · Zoom UI/H/V
- [x] Chrome booth language aligned with Admin (tokens / ShellIconButton / status groups)

### Canvas

- [x] Eye menu · track grid · Forma + Countdown
- [x] Forma / Tekst / Akordy / Cue move/resize/pencil drag-range — wired (QA PO)
- [x] Tempo / Metrum / Tonacja (keyMap) readout + pencil/scissors/eraser + drag-move + multi-select (⌘/⇧)
- [ ] Audio lane + playback — β2 (lane UI ukryte do czasu silnika)
- [x] Inspector + song screen UG
- [x] Kotwice — edit (scoreBarMap)
- [x] Scissors — Forma (subsections) + content lanes
- [x] Forma subsections — select + boundary drag + 4-bar fill + inspector Podsekcje (list / + / ×)

## Admin

- [x] Chrome, status, Utwory (filtr/sort/PC/Ostrzeżenia/Batch PC/Wzory/Eksport)
- [x] MusicXML upload (XML / Partytura)
- [x] Set / Scena presence
- [x] Utwory: import/export `.stagesync.json` (kafelek Pliki pod Wybrany)
- [x] Host: logi SSE · **Restart / Wyłącz (2×)** · sieć (readout) · MIDI → β2
- [x] Wygląd: jasny / wysoki kontrast (`data-theme` / `data-contrast`)
- [ ] Sprawdź aktualizacje / Apply — ADR 0004
- [ ] Backup Przywróć — później

## Client

- [x] Role + →następny + fullscreen + presence hello
- [x] Grid live · score stub (lista MusicXML)
- [x] Wygląd (jasny / kontrast) · karaoke skala tekstu / auto-scroll · score ± zoom lokalny
- [x] Grid: H zamiast B / litery / animacje
- [x] Tap wokalu (Client → tekst startTicks)
- [x] Edycja notatek Formy
