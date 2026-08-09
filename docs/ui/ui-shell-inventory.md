# Inventarz kontrolek UI (v4 → v5 shelle)

**Rola:** checklista **wtórna** — aktualizuj **po** działającym geście / flow, nie przed.  
Parity = **zachowanie** ([ADR 0011](../adr/0011-ui-parity-behavior.md)), nie „jest przycisk”.  
Layout paneli = **nowy** ([ADR 0003](../adr/0003-ui-direction-booth.md)); paleta black/amber; **zakaz** clone chrome z 4.x.

**Aktywny backlog:** [TODO.md](../TODO.md) (5.2+). Ten plik = stan kontrolek w shellu po **5.1.x**, nie parking lot planu.

`[x]` poniżej = „kontrolka istnieje w shellu” — **nie** = green PO smoke. Usunięcie bez „Świadome delty” = blocker dopiero gdy zachowanie jest w scope.

**β gate:** [report-parity-blocker-alpha8.md](../analysis/reports/milestones/report-parity-blocker-alpha8.md) — **P8 green 2026-07-21**.  
**PO smoke playbook:** [report-po-smoke-p8.md](../analysis/reports/milestones/report-po-smoke-p8.md).  
**PO C1 / P8:** **PO verified 2026-07-21** (zachowanie; inventarz `[x]` = kontrolka, nie parity).  
**SSOT luk historycznych:** [report-v4-v5-gap-audit.md](../analysis/reports/milestones/report-v4-v5-gap-audit.md).  
**Audyt UI-diff:** [report-v4-v5-ui-diff-inventory.md](../analysis/reports/milestones/report-v4-v5-ui-diff-inventory.md).

### Reguła: brak funkcji = brak UI

**Zakaz** umieszczania `disabled` kontrolek w status/toolbar „na zapas” (inventarz-first).

## Świadome delty v5 (pozostałe OUT)

| Delta                                          | Uwagi                                                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Countdown widoczny; długość = pre-roll ≤ 0     | Semantyka v5                                                                                                                         |
| − git-apply / „Zaktualizuj teraz”              | [ADR 0004](../adr/0004-updates-docker.md) — **nigdy**                                                                                |
| SPA: linki Admin → `/timeline`, `/`            | Bez labowego ShellNav                                                                                                                |
| React + CSS Modules + `--ss-*`                 | Stack v5; SSOT warstw: [docs/ui/README.md](./README.md)                                                                              |
| Admin: Utwory · Set · Scena · Host · Dev (DEV) | IA v5 — **Set + wybór utworów w jednym flow**; `Dev` tylko w buildach deweloperskich ([ADR 0011](../adr/0011-ui-parity-behavior.md)) |
| Paczka `.stagesync`                            | MVP JSON (`.stagesync.json`) — bez zip/archiver legacy                                                                               |
| Backup restore / path picker FS                | Admin Ustawienia → Serwer → Przywróć… (`.bak` / bulk / ZIP + confirm + PIN)                                                          |
| Mixer — fizyczne Out 3–4 / bus→bus             | [TODO.md](../TODO.md) § 5.2+ (bez atrap)                                                                                             |
| Forma scissors = subsections v4                | v5: insert + drag granic + select + 4-bar fill + **inspector list / + / ×**                                                          |

## Timeline — wymagania layoutu (parity v4, α4+)

1. **Jedna siatka wierszy:** nagłówek ścieżki (dock) i lane canvas w **tym samym wierszu**.
2. **Kolejność pionowa:** Tempo → Tonacja → Metrum → Kotwice → Forma → Tekst → Akordy → Cue → Audio 0…N.
3. **Eye menu:** ukrywanie pojedynczych śladów; Forma zawsze widoczna.
4. **Responsywność:** węższe okno nie rozdziela nagłówków od lane’ów.
5. **Mobile (≤768, `data-tl-tier="mobile"`):** tryb podglądu / odtwarzania — bez Inspectora, Tap, „Dodaj ścieżkę”, Miksera i Snap; transport + utwór + zoom H/V.

## Timeline

### Tools

- [x] `smart` / `pointer` / `pencil` / `eraser` / `scissors` (Forma + Tekst/Akordy/Cue)
- [x] Zoom — suwaki H/V/UI w statusie (+ Ctrl/Meta+wheel); **bez** narzędzia lupy na pasku
- [x] `gain` / `mute` (+ solo / fade / marquee / join w menu T)
- [x] `wand` + menu — Tekst→Forma / Akordy→Forma / obie (zakres = zaznaczone sekcje)
- [x] `tap` na docku Tekst (tempo)
- [x] Panel narzędzi **T** (PO verified)

### Header / transport

- [x] Brand, Metadane (tytuł, defaultBpm, PC, artysta, gatunek, tonacja)
- [x] Setlista ← / picker / → · Auto-setlista
- [x] Undo / Redo / Odrzuć / Zapisz · Pomoc · Wygląd · Pełny ekran
- [x] Stop / Play · Loop (region + server SSOT) · BBT · Tempo / Metrum / Tonacja edit @ playhead
- [x] Metronom · Follow playhead · MIDI playhead (Wygląd) · Dirty · Zoom UI/H/V
- [x] Chrome booth language aligned with Admin (tokens / ShellIconButton / status groups)
- [x] Mixer (Master \| Bus; strefy Audio / Busy / Click) — linia 5.1

### Canvas

- [x] Eye menu · track grid · Forma + Countdown
- [x] Forma / Tekst / Akordy / Cue move/resize/pencil drag-range — wired (QA PO)
- [x] Tempo / Metrum / Tonacja (keyMap) readout + pencil/scissors/eraser + drag-move + multi-select (⌘/⇧)
- [x] Audio lane + playback (0…N) — β2+
- [x] Inspector + song screen UG
- [x] Kotwice — edit (scoreBarMap)
- [x] Scissors — Forma (subsections) + content lanes
- [x] Forma subsections — select + boundary drag + 4-bar fill + inspector Podsekcje (list / + / ×)

## Admin

- [x] Chrome, status, Utwory (filtr/sort/PC/Ostrzeżenia/Batch PC/Wzory/Eksport)
- [x] MusicXML upload (XML / Partytura)
- [x] Set / Scena presence
- [x] Utwory: import/export `.stagesync.json` (kafelek Pliki pod Wybrany)
- [x] Host: logi SSE · **Restart / Wyłącz (2×)** · sieć · MIDI I/O
- [x] Wygląd: jasny / wysoki kontrast (`data-theme` / `data-contrast`)
- [x] Sprawdź aktualizacje / Aktualizuj host (Watchtower) + Aktualizuj aplikację (Tauri updater) — [ADR 0004](../adr/0004-updates-docker.md)
- [x] Backup Przywróć — Admin Ustawienia → Przywróć… (`.bak` / bulk / ZIP)
- [x] Dev (DEV): Smart Tempo benchmark, Dev Preview multi-surface, Layout Matrix, planowane narzędzia diagnostyczne

## Client

- [x] Role + →następny + fullscreen + presence hello
- [x] Grid live · score OSMD (MusicXML + playhead sync + click-to-seek)
- [x] Wygląd (jasny / kontrast) · karaoke skala tekstu / auto-scroll · score ± zoom + follow playhead
- [x] Grid: H zamiast B / litery / animacje
- [x] Tap wokalu (Client → tekst startTicks)
- [x] Edycja notatek Formy
- [x] CL-01 Karaoke bar fill / beat pulse — **PO verified** (C1 / P8 2026-07-21)
- [x] CL-04 Grid cycle multi-bar — **PO verified** (C1 / P8 2026-07-21)
- [x] CL-05 Forma strip past/current — **PO verified** (C1 / P8 2026-07-21)
- [x] **P8** Sign-off PO — **green 2026-07-21**
- [x] Tonacja koncertowa / polskie nazwy sekcji — C/B♭/E♭/ręczna + switch nazw
