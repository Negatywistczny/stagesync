# StageSync — Roadmapa

Kierunek produktu (długoterminowy). **Bieżąca checklista:** [TODO.md](./TODO.md)
(tylko aktywny etap). Historia wydań: [CHANGELOG.md](../CHANGELOG.md).

## Etapy wydania

| Wersja | Hero | Done (kryterium zamknięcia) | Scope |
|--------|------|-----------------------------|-------|
| **5.0.0-alpha.3** | Pion treści w ticks: Forma + mapy + zapis + transport + sekcja | Create → Timeline → pencil → save → play → Admin „Sekcja” | [report-scope-alpha3](./analysis/reports/report-scope-alpha3.md) |
| **5.0.0-alpha.4** | Timeline layout + operacyjne domknięcie Formy | Track grid (nagłówek↔lane); eye per ślad; specjalne nad treścią; picker; inspector; mapy read-only | [report-scope-alpha4](./analysis/reports/report-scope-alpha4.md) — *audyt 2026-07-20: bramka zamknięta do `feat/timeline-track-grid`* |
| **5.0.0-alpha.5** | Client roles poza Formą/`drums` | Karaoke wired z transportem + kontekstem projektu | [report-scope-alpha5](./analysis/reports/report-scope-alpha5.md) |
| **5.0.0-alpha.6** | Admin Live Desk — setlista, scena, pliki | Import audio do projektu; metadata clipów; setlista; pliki w inspectorze | [report-scope-alpha6](./analysis/reports/report-scope-alpha6.md) |
| **5.0.0-alpha.7** | Edycja Timeline (Forma + lane’y treści) | Smart Tool; Forma move/resize/pencil drag; Tekst/Akordy/Cue (start); Tap/UG/Różdżka wg cut | [report-scope-alpha7](./analysis/reports/report-scope-alpha7.md) |
| **5.0.0-alpha.8** | Parity workflow 4.x | **Code freeze 2026-07-20** — engineering must + rebuild TE-P0/CD/chrome/Admin; **nie** β ([freeze](./analysis/reports/report-alpha8-code-freeze.md)); residual PO + CL-P0 → α9 | QA: [report-qa-signoff-alpha8](./analysis/reports/report-qa-signoff-alpha8.md) · [parity-blocker](./analysis/reports/report-parity-blocker-alpha8.md) |
| **5.0.0-alpha.9** | Migrator + dokończenie rebuild | **Wydane 2026-07-21** — Migrator M1–M9 ✓; Client CL-01/04/05 ✓; **PO smoke P8 green**; tag `v5.0.0-alpha.9` | [report-scope-alpha9](./analysis/reports/report-scope-alpha9.md) |
| **5.0.0-alpha.10** | Standalone desktop (β1 spike) | **Wydane 2026-07-21** — Tauri + Node sidecar; pierwszy `.dmg`/`.msi` standalone | [report-standalone-spike-beta1](./analysis/reports/report-standalone-spike-beta1.md) |
| **5.0.0-alpha.11** | Desktop shell polish | **Wydane 2026-07-21** — menu OS Widok, shell detect, draft updater pipeline; bramka G1–G10 (G6: α10→α11) | [report-beta-gate](./analysis/reports/report-beta-gate.md) |
| **5.0.0-alpha.12** | Domknięcie: OS menu Faza A + hotfixy shelła | **Wydane 2026-07-21** — menu StageSync/Widok/Pomoc; sidecar fail-fast; Faza B+ → β1 | [TODO.md](./TODO.md) · [ADR 0010](./adr/0010-desktop-shell-tauri.md) |
| **5.0.0-alpha.13** | Hotfix: Windows sidecar `EISDIR` / `C:` | **Wydane 2026-07-21** — MSI: Node bez ścieżek `\\?\…` jako main module; spawn względny + cwd | [TODO.md](./TODO.md) · [DESKTOP.md](./DESKTOP.md) |
| **5.0.0-beta.1** | Host / dystrybucja | **Wydane 2026-07-21** — H1–H12 (α10–α13); residual (menu Faza B, G1–G10) → **must β2** (docs cut `5.0.0-beta.1.1`) | [report-scope-beta1](./analysis/reports/report-scope-beta1.md) |
| **5.0.0-beta.1.1** | Docs cut residual | **Wydane 2026-07-21** — residual β1 → must β2; scope report β2 | [TODO.md](./TODO.md) · [report-scope-beta2](./analysis/reports/report-scope-beta2.md) |
| **5.0.0-beta.2** | Audio + MIDI + menu B/C | **Wydane 2026-07-21** — Audio 0…N; MIDI serwera; menu Faza B+C; Countdown; updater darwin+windows; G1–G10 residual operatorski | [report-scope-beta2](./analysis/reports/report-scope-beta2.md) |
| **5.0.0** | Stabilne wydanie + nazwa hero linii 5.0 | **Aktywny** — polish UI (zoom, help, copy, gęstość); fade/Faza D; `docs/api`; CI + smoke E2E; G1–G10 green | [TODO.md](./TODO.md) |
| **5.1+** | Motywy, auth, kolejne minor features | TBD przy planowaniu linii 5.1 | — |

### Alpha 4 — zakres orientacyjny

**Must (layout — przed feature):**

- Track grid: synchronizacja dock (nazwy ścieżek) ↔ lane canvas
- Eye: per-ślad (nie tylko „Specjalne on/off”)
- Kolejność: Tempo / Tonacja / Metrum / Kotwice **nad** Formą/Tekstem/Akordami/Cue

**Must (produkt):**

- Lane Tempo/Metrum read-only z map; inspector rename + CD length
- Song picker z biblioteki; dirty polish; transport/load w UI
- **Snap grid (faza 1):** ołówek Forma przez `quantizeTicks` @ shared ([ADR 0007](./adr/0007-snap-grid.md)); domyślnie `bar`

**Should:** Admin panel toggle UX; empty state „Pliki projektu”; Client drums polish; BBT M1–M3

**OUT:** Tap, UG, Różdżka, pełne lane’y Tekst/Akordy/Cue, Undo/Redo  
**Odłożone do 5.0.0:** zoom (ikony/suwaki), pełna treść Pomocy; **snap UI** (picker beat/subdivision, faza 2 ADR 0007)

Plan PR: [report-implementation-plan-alpha4.md](./analysis/reports/report-implementation-plan-alpha4.md).

### Alpha 5 — zakres orientacyjny

- Wiring ról Client (grid akordów, karaoke, partytura — stopniowo)
- **OUT:** pełna partytura OSMD / MusicXML (ew. α7)

### Alpha 6 — zakres orientacyjny

- Setlista, auto-setlista, host settings/logs
- **Pliki projektu:** import audio do `data/projects/<id>/`; lista w inspectorze; **schema v3** (refs clipów) — bez pełnego silnika lub ze stubem
- IA Admin: Set / Utwory — **korekta** w rebuild: Set + wybór utworów w **jednym flow** ([ADR 0011](./adr/0011-ui-parity-behavior.md)); osobne zakładki nie mogą łamać „dodaj zaznaczone”
- **OUT:** silnik odtwarzania, edycja geometryczna audio na Timeline (→ β2)

### Alpha 7 — zakres orientacyjny

- **Forma editing** ([ADR 0008](./adr/0008-timeline-clip-editing.md)): pencil drag, pointer move/resize, select+Delete, Smart Tool FSM, transakcyjny drag, no overlap
- **Snap:** Cmd/Ctrl = chwilowy snap off; drag/scissors/mapy przez `quantizeTicks` (faza 3 ADR 0007)
- Tap, UG, Różdżka; edycja lane’ów Tekst/Akordy/Cue (ticks v2) — wg scope report
- **OUT α7:** pełny stos Undo/Redo (draft + Zapisz/Odrzuć wystarczy); audio playback

### Alpha 8 — zakres orientacyjny (+ rebuild) — **code freeze**

- Pierwotny scope α8 (Akordy/Cue, scissors, Tap, UG, Undo, metronom…) = w kodzie
- **Rebuild (ADR 0011):** Timeline TE-P0/CD/chrome + Admin polish = **code**; czeka PO smoke
- Domknięcie: [report-alpha8-code-freeze.md](./analysis/reports/report-alpha8-code-freeze.md)
- Bramka β: [parity-blocker](./analysis/reports/report-parity-blocker-alpha8.md) — **P8 green 2026-07-21** (β1 na prośbę)
- **OUT α8:** audio/MIDI → β2; Docker / Tauri → β1; migrator hero → α9;
  git-apply (nigdy); Docker-as-update model

### Alpha 9 — zakres orientacyjny (**wydane 2026-07-21**)

- Migrator legacy 4.x → v5 (MVP + fixtures M1–M9)
- **CL-01 / 04 / 05** Client P0 + **PO smoke P8 green** (zachowanie)
- Tag `v5.0.0-alpha.9` — done; `v5.0.0-alpha.10`…`v5.0.0-alpha.13` desktop — wydane; **β1** / **β2** wydane; aktywny etap → **5.0.0** ([TODO.md](./TODO.md))

### Alpha 12 — zakres orientacyjny (**wydane 2026-07-21**)

- **Must:** merge + tag Fazy A menu OS (StageSync | Widok | Pomoc); drobne hotfixy shelła / CI
- **OUT α12:** menu Faza B+; pełna bramka G1–G10 jako hero; nowe powierzchnie produktu → **β1**
- Tag `v5.0.0-alpha.12` — done

### Alpha 13 — hotfix Windows sidecar (**wydane 2026-07-21**)

- **Must:** naprawa `EISDIR` / `lstat 'C:'` przy starcie sidecara z MSI (ścieżki Win32 `\\?\…` vs Node main module)
- **OUT α13:** menu Faza B+; bramka G1–G10; reszta host/dystrybucja → **β1**
- Tag `v5.0.0-alpha.13` — done; **β1** / **β1.1** / **β2** wydane 2026-07-21; aktywny etap w TODO = **5.0.0** (start kodu na prośbę)

### Beta 1 — zakres orientacyjny (standalone-first host / dystrybucja) — **wydane 2026-07-21**

> **P8 green 2026-07-21.** Tag `v5.0.0-beta.1` = **milestone dystrybucyjny** (H1–H12 w α10–α13 + closeout docs).
> Scope: [report-scope-beta1.md](./analysis/reports/report-scope-beta1.md).
> Docs cut `v5.0.0-beta.1.1` (2026-07-21): residual **menu Faza B** + ręczna **G1–G10** = **must β2** (nie soft carry) — [report-beta-gate.md](./analysis/reports/report-beta-gate.md) · [report-scope-beta2.md](./analysis/reports/report-scope-beta2.md).
> Świadome OUT β1: git-apply; audio/MIDI/Live Desk/wand/Help feature/P1 Timeline (→ β2 / 5.0.0).

- Docker Compose ([ADR 0004](./adr/0004-updates-docker.md)): obraz + volume `data/`; update = bump tagu — **ścieżka drugorzędna** dla rack/server; [INSTALL.md](./INSTALL.md)
- **Tauri** desktop standalone ([ADR 0010](./adr/0010-desktop-shell-tauri.md)): shell + Node sidecar; Win + mac; **bez** autorytetu czasu w shellu
- Stabilność hosta: shadow backup, OCC (`409`), migracja schematu, ESLint ACL, API Zod `details` (bazowo w α10/α11)
- **Bramka G1–G10** — nie zamknięta przy β1; **must weryfikacji przed tagiem β2**
- **Desktop OS menu — Faza B** — nie wdrożona w β1; **must β2** (Plik, Host, Open Recent, Zapisz, status/QR/klienci) — § poniżej
- Doprecyzowanie ADR 0002 (tempo/metrum pre-roll); E2E Forma + transport — should (carry)
- **OUT β1:** audio / MIDI / AD-01…03 / wand / Timeline Help feature / P1 Timeline → β2 lub 5.0.0; Android; store auto-update
- **Migrator:** α9 (done)

### Desktop OS menu (natywny menubar Tauri)

Mapa docelowa menu operatora. Implementacja warstwami; **bez** disabled „na zapas”. Akcje → `navigate` / istniejące commandy shella (SSOT w `apps/server`, nie MIDI w procesie Tauri).

| Faza | Top-level | Enabled (plan) | Etap |
|------|-----------|----------------|------|
| **A** | StageSync, Widok, Pomoc | O programie; aktualizacje; Quit; Admin/Timeline/Klient; zakładki Admina; fullscreen; docs/issues | **α12** (wydane) |
| **B** | + Plik, + Host | Open Recent; Zapisz (Timeline draft); status hosta / klienci WS / QR (gdy API); restart wg istniejącego API; Ustawienia… → Host | **β2** (wydane) |
| **C** | + Transport; ścieżki w Plik/Set | Play/Stop/next/prev przez serwer; Import audio (już Admin); MIDI I/O gdy serwer (nie w shellu) | **β2** (wydane) |
| **D** | pełna Edycja; zoom w Widok; rozbudowa Pomoc | Undo gdy stack; PDF setlisty; archiwum projektu; overlay skrótów; motyw sceniczny | **5.0.0** |

**OUT menu do czasu właściwego etapu:** Audio / MIDI / DMX settings w menubarze; MUTE ALL / PANIC; Tap Tempo / Pre-count w menu; osobne top-level Setlista (Set zostaje w Admin / Faza B Host lub Plik).

Propozycja pełnej struktury (referencja produktowa): StageSync · Plik · Edycja · Widok · Setlista · Transport · Host · Pomoc — realizowana przez fazy A→D, nie jednym PR.

### Beta 2 — zakres orientacyjny (audio + MIDI + menu B/C) — **wydane 2026-07-21**

Tag `v5.0.0-beta.2`. Scope: [report-scope-beta2.md](./analysis/reports/report-scope-beta2.md).

- **Audio 0…N** ([ADR 0008](./adr/0008-timeline-clip-editing.md)): clip na Timeline, sync transport (`ticksToMs`), trim/move, waveform peak/RMS, gain clip + fader track + mute clip/track; **bez** pencil, **bez** stretch poza plik
- MIDI I/O (clock / urządzenia po stronie **serwera**) — nie w Tauri ([ADR 0010](./adr/0010-desktop-shell-tauri.md))
- **Desktop OS menu — Faza B + C** (done)
- **G1–G10** — residual operatorski przy cutcie (⬜ na HW); must green przed / przy **5.0.0** ([report-beta-gate.md](./analysis/reports/report-beta-gate.md))
- **OUT β2:** fade/crossfade/loop-region; Faza D menu; Android native; MIDI w procesie Tauri; Flex Time

### 5.0.0 — zakres orientacyjny — **aktywny**

Checklista: [TODO.md](./TODO.md).

- Polish UI na żywych kontrolkach (typografia, proporcje, copy, gęstość)
- Timeline: zoom UI/H/V z ikonami; Pomoc z pełną treścią; **snap picker** (beat/subdivision)
- Audio polish: fade, crossfade, loop-region; ewent. overlap mode
- **Desktop OS menu — Faza D**
- Admin: drobne UX (np. panel toggle) jeśli nie w α4
- Operator: G1–G10 green na instalatorach

### Po 5.0.0

- Motywy (`data-theme` + switcher)
- Auth / multi-user (speculative)
- Android (PWA / Capacitor) — jeśli produkt wymaga sklepu

## Zasady operacyjne

1. **Jeden aktywny etap w TODO** — po tagu `v5.0.0-alpha.N` pełne czyszczenie
   [TODO.md](./TODO.md) i wyłącznie sekcja alpha.N+1 (procedura w TODO).
2. **Scope report** `docs/analysis/reports/report-scope-alphaN.md` (lub `…-betaN`)
   tuż przed kodem danego etapu; ROADMAP trzyma hero + done na wysokim poziomie.
3. **Pull-forward** (alpha.4–7): drobne zadania z alpha.N+1 można wciągnąć do
   bieżącego TODO bez zmiany numeracji etapów w ROADMAP.
4. **Beta:** po green PO smoke (zachowanie v4) + α9 migrator → β1 (host) →
   β2 (audio/MIDI) → 5.0.0. **P8 green 2026-07-21** — tag β tylko na prośbę.
5. **Fundament** przypisany do etapu (α4, β1 host, β2 audio), nie osobny work bucket.
6. **Dług layoutu shelli** (α3): nie blokuje release α3; domknięcie w α4 must PR #1.
7. **Snap / edit grid** ([ADR 0007](./adr/0007-snap-grid.md)): faza 0 (API shared) — done; faza 1 → α4; UI picker → 5.0.0; drag/scissors → α7; Cmd-off → α7.
8. **Edycja klipów** ([ADR 0008](./adr/0008-timeline-clip-editing.md)): Forma α7; audio β2; fade/crossfade → 5.0.0.
9. **Desktop** ([ADR 0010](./adr/0010-desktop-shell-tauri.md)): Tauri w β1; audio/MIDI nie w procesie shella.
10. **Parity vs v4** ([ADR 0011](./adr/0011-ui-parity-behavior.md)): źródło = zachowanie w
    `STAGESYNC-APP-LEGACY`; **nie** clone chrome; inventarz wtórny; zakaz *engineering ready*
    bez PO smoke. Wyjątki tylko jako świadome OUT.
    Audyt: [report-v4-v5-parity-audit.md](./analysis/reports/report-v4-v5-parity-audit.md) ·
    UI-diff: [report-v4-v5-ui-diff-inventory.md](./analysis/reports/report-v4-v5-ui-diff-inventory.md).

## Granica 0

Zmiana aksjomatów czasu (takt 1 / pre-roll ≤ 0 / ticks) lub izolacji folderów
projektów = nowa edycja, nie pozycja roadmapy „feature”. Zob.
[ADR 0005](./adr/0005-domain-axioms.md).
