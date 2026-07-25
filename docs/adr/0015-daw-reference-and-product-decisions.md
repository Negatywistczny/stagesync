# ADR 0015 — Referencja DAW (Logic) i stałe decyzje produktowe

- **Status:** Zaakceptowany
- **Data:** 2026-07-25
- **Etap:** po `5.1.3` (SSOT decyzji PO; implementacja częściowa / backlog osobno)
- **Uzupełnia:** [ADR 0011](./0011-ui-parity-behavior.md) (parity / zakaz stubów), [ADR 0008](./0008-timeline-clip-editing.md) (edycja), [ADR 0002](./0002-timebase-ssot.md) (MIDI / transport)

## Kontekst

Po fali Q&A PO pojawiły się **trwałe decyzje produktowe** oraz wiele pozycji **backlogu**. Trzeba je rozdzielić w SSOT: decyzja ≠ „zaparkowane w TODO”. Backlog bez PO nie staje się decyzją „OUT na zawsze”.

## Decyzja

### 0. Higiena: backlog ≠ decyzja

- **Decyzja produktowa** = stabilny kontrakt (ADR / konstytucja / jawny OUT).
- **Backlog** = praca do zrobienia (TODO / issue). Sam wpis w TODO **nie** jest decyzją OUT.
- Nie przenoś deferrali z triage / starych docs do „permanent OUT” bez PO.

### 1. Reguła referencji Logic Pro

W sytuacjach wątpliwości UX i logiki edycji: **Logic Pro jest pierwszą referencją** sprawdzonych mechanik DAW (nie pixel-clone chrome).

**Kolejność konfliktów:**

1. SSOT czasu + zakaz stubów ([ADR 0002](./0002-timebase-ssot.md), [ADR 0011](./0011-ui-parity-behavior.md))
2. Logic Pro (gdy StageSync nie ma własnej specyfikacji zachowania)
3. Inne DAW / inspiracje — wtórne

### 2. Zakres UI

| Decyzja | Treść |
|---------|--------|
| Brak funkcji = brak UI | Potwierdzenie [ADR 0011 §1a](./0011-ui-parity-behavior.md) — bez stubów / `disabled` „na zapas” |
| Multi-out (Out 3–4+) | **Oficjalna decyzja: wprowadzić** (klasyczny DAW). Implementacja = backlog; **nie** „limit bez PO” |
| Motywy / auth / multi-user | Backlog — **nie** wymyślać permanent OUT bez PO |

### 3. Mixer / audio (stałe)

| Temat | Decyzja |
|-------|--------|
| True Balance centrum unity / +3 dB mono↔stereo | Zamierzone OK |
| Dual-mono equal-power downmix (+3 dB skorelowane) | Zamierzone OK |
| Track solo vs bus solo | **Track solo wygrywa** |
| Click w Mixerze | Na start proste Mute/Volume jako Cue; **interfejs otwarty** na ewolucję |
| Mixer Zoom | Tylko skala UI — **bez** niezależnego Zoom H/V |
| Safari scratch (WebAudio) | **Nie** akceptowany permanent limit — otwarte do naprawy |

### 4. Edycja audio / Timeline

| Temat | Decyzja |
|-------|--------|
| Pencil na ścieżce **audio** | Jak Logic: klik w pustym + Pencil → Import / File Browser → wstawienie klipu w dokładnej pozycji na Timeline (implementacja = backlog) |
| No Overlap only; bez time-stretch w MVP | Bez zmiany względem [ADR 0008](./0008-timeline-clip-editing.md) |
| Flex Time / MIDI recording / Take Folders / join bounce | **Nie** permanent OUT — silnik sceniczny teraz; zaawansowana edycja / recording później wg wzorców Logic (patrz aktualizacja ADR 0008) |
| Locator vs playhead | Osobne pojęcia (jak Logic); **nie** scalać kolorów/IA bez decyzji; scrub/seek = komenda do serwera (SSOT). Szczegóły IA = późniejszy pass |

### 5. MIDI / transport

| Temat | Decyzja |
|-------|--------|
| MIDI I/O + clock | Tylko serwer ([ADR 0002](./0002-timebase-ssot.md)) |
| Playhead klienta | Wygładzanie wyłącznie między tickami serwera |
| Kanał Program Change IN/OUT | Filtr IN (Omni = `null` albo pojedynczy kanał) + kanał OUT w `MidiHostConfig` + Admin Host — **do wdrożenia teraz** (ochrona przed spill Omni) |
| Flood PC | **Debounce 50 ms + latest-wins**; **bez** osobnego Hz-limitera |
| Ujemne ticki | Na krawędzi MIDI I/O mapowane do **0** (SPP / clock) |
| Encore poza setlistą | `resolveSetlistNext` → `null` + hard **STOP** |
| FOH Seek/Pause vs late disk I/O | FOH wygrywa (already) |
| Wsteczne / stale ticki WS | Cichy drop w UI gdy `serverTimeMs` / monotonic seq niższy niż ostatni przyjęty |
| H-01 throttle displayTicks | Dopiero **po** profilerze @ 120 Hz |

### 6. Priorytet / bramki (polityka operacyjna)

- Po 5.1.x **Must** = wyłącznie residual **G1–G10** operatorskie (bez nowych feature w Must).
- G2 skip; G3 re-verify HW; G7–G9 Docker deferred — OK jako ops w TODO.
- Should / higiena **nie** blokuje planowania feature.

### 7. Mobile / Backup / shell / packaging

| Temat | Decyzja |
|-------|--------|
| Mobile PWA + lekki Android + `.apk` bez Play | **Zatwierdzony kierunek architektoniczny**; pozycje implementacji = backlog |
| `mobile-full` + sidecar | Późniejszy backlog |
| Backup Przywróć (pełne GUI) | Backlog, nie decyzja OUT |
| Auto-update bez operatora | **Permanentnie NIE** na scenie — zawsze akcja człowieka |
| Pakiet projektu | MVP = `.stagesync.json` (na teraz) |
| Menubar OS | **OUT:** ustawienia Audio/MIDI/DMX, Tap Tempo/Pre-count, top-level Setlista (sterowanie w Admin); lekki tray OK |
| git-apply / „Zaktualizuj teraz” | **Permanentnie OUT** |

## Konsekwencje

- Konstytucja wskazuje ten ADR (reguła Logic + backlog ≠ decyzja).
- ADR 0008: sekcja OUT bez absolutnego „nigdy” dla Flex/Takes/recording; wyjątek Pencil→import audio.
- TODO: PC kanały = aktywna praca; multi-out = decyzja + backlog implementacji; Must = G1–G10.
- CHANGELOG tylko przy zmianach widocznych w produkcie (np. MIDI PC kanały + debounce) — nie za sam ADR.

## Powiązane

- [ADR 0002](./0002-timebase-ssot.md), [0008](./0008-timeline-clip-editing.md), [0010](./0010-desktop-shell-tauri.md), [0011](./0011-ui-parity-behavior.md)
- [ADR 0004](./0004-updates-docker.md) — aktualizacje (bez auto bez operatora)
