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
| **5.0.0** | Stabilne wydanie + nazwa hero linii 5.0 | **Aktywny (kod A–E + Faza D + OSMD/migration/wand na `main`)** — brak tagu; residual = **G1–G10** operator; hero przy cutcie | [report-scope-5.0.0](./analysis/reports/report-scope-5.0.0.md) · [TODO.md](./TODO.md) |
| **5.1+** | Motywy, auth, kolejne minor features | TBD przy planowaniu linii 5.1 | — |

### Zamknięte etapy (α3–β1)

Hero / kryterium done: **tabela powyżej**. Historia wydań: [CHANGELOG.md](../CHANGELOG.md).  
Scope reports: `docs/analysis/reports/report-scope-*` (+ freeze/parity α8, spike β1).  
Szczegółowe checklisty „orientacyjne” zamkniętych cutów usunięte po β2 — nie utrzymujemy ich jako aktywnego planu.

### Desktop OS menu (natywny menubar Tauri)

Mapa docelowa menu operatora. Implementacja warstwami; **bez** disabled „na zapas”. Akcje → `navigate` / istniejące commandy shella (SSOT w `apps/server`, nie MIDI w procesie Tauri).

| Faza | Top-level | Enabled (plan) | Etap |
|------|-----------|----------------|------|
| **A** | StageSync, Widok, Pomoc | O programie; aktualizacje; Quit; Admin/Timeline/Klient; zakładki Admina; fullscreen; docs/issues | **α12** (wydane) |
| **B** | + Plik, + Host | Open Recent; Zapisz (Timeline draft); status hosta / klienci WS / QR (gdy API); restart wg istniejącego API; Ustawienia… → Host | **β2** (wydane) |
| **C** | + Transport; ścieżki w Plik/Set | Play/Stop/next/prev przez serwer; Import audio (już Admin); MIDI I/O gdy serwer (nie w shellu) | **β2** (wydane) |
| **D** | pełna Edycja; zoom w Widok; rozbudowa Pomoc | Usuń; Zoom H; Skróty; Undo grey-out (PDF setlisty / archiwum / motyw — OUT jeśli nie API) | **5.0.0** (wydane w kodzie — [#460](https://github.com/Negatywistyczny/stagesync/pull/460)) |

**OUT menu do czasu właściwego etapu:** Audio / MIDI / DMX settings w menubarze; Tap Tempo / Pre-count w menu; osobne top-level Setlista (Set zostaje w Admin / Faza B Host lub Plik). **MUTE ALL / PANIC** — zachowanie v4 = must **5.0.0** (host/UI; nie defer 5.1); pozycja w menubarze opcjonalna.


Propozycja pełnej struktury (referencja produktowa): StageSync · Plik · Edycja · Widok · Setlista · Transport · Host · Pomoc — realizowana przez fazy A→D, nie jednym PR.

### Beta 2 — zakres orientacyjny (audio + MIDI + menu B/C) — **wydane 2026-07-21**

Tag `v5.0.0-beta.2`. Scope: [report-scope-beta2.md](./analysis/reports/report-scope-beta2.md).

- **Audio 0…N** ([ADR 0008](./adr/0008-timeline-clip-editing.md)): clip na Timeline, sync transport (`ticksToMs`), trim/move, waveform peak/RMS, gain clip + fader track + mute clip/track; **bez** pencil, **bez** stretch poza plik
- MIDI I/O (clock / urządzenia po stronie **serwera**) — nie w Tauri ([ADR 0010](./adr/0010-desktop-shell-tauri.md))
- **Desktop OS menu — Faza B + C** (done)
- **G1–G10** — residual operatorski przy cutcie (⬜ na HW); must green przed / przy **5.0.0** ([report-beta-gate.md](./analysis/reports/report-beta-gate.md))
- **OUT β2:** fade/crossfade/loop-region; Faza D menu; Android native; MIDI w procesie Tauri; Flex Time

### 5.0.0 — zakres orientacyjny — **aktywny (kod domknięty; brak tagu)**

Checklista: [TODO.md](./TODO.md). Scope: [report-scope-5.0.0.md](./analysis/reports/report-scope-5.0.0.md).  
**Polityka (2026-07-22):** parytet **zachowania v4** kompletny w `5.0.0` — bez stubów;
funkcja z v4 nie idzie na 5.1+ ([ADR 0011 §1a](./adr/0011-ui-parity-behavior.md)).

**W kodzie na `main` (must A–E + residual closeout 2026-07-22):**

- Polish UI na żywych kontrolkach (typografia, proporcje, copy, gęstość)
- Timeline: zoom UI/H/V z ikonami; Pomoc + skróty; **snap picker** (beat/subdivision)
- Audio polish: fade, crossfade, loop-region (+ WebAudio envelope)
- **Desktop OS menu — Faza D** — done ([#460](https://github.com/Negatywistyczny/stagesync/pull/460))
- Mobile / tablet breakpoints + Client touch targets ([#464](https://github.com/Negatywistyczny/stagesync/pull/464))
- `docs/api` + CI + smoke E2E

**Operator / przed tagiem (nie claim green w docs):**

- G1–G10 na instalatorach β2 — [report-beta-gate](./analysis/reports/report-beta-gate.md)
- OSMD / migration assets / wand karaoke — merged (#465–#467)
- Nazwa hero linii 5.0 + bump/tag — **tylko na prośbę**

### Po 5.0.0

- Motywy (`data-theme` + switcher) — **nowość** (nie dług v4)
- Auth / multi-user (speculative)
- Android (PWA / Capacitor) — jeśli produkt wymaga sklepu
- Inne **nowe** minor bez długu operatorskiego v4


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
    bez PO smoke. **§1a:** funkcja v4 → must `5.0.0` (chyba że usunięta); **zakaz stubów**.
    Audyt: [report-v4-v5-parity-audit.md](./analysis/reports/report-v4-v5-parity-audit.md) ·
    UI-diff: [report-v4-v5-ui-diff-inventory.md](./analysis/reports/report-v4-v5-ui-diff-inventory.md).

## Granica 0

Zmiana aksjomatów czasu (takt 1 / pre-roll ≤ 0 / ticks) lub izolacji folderów
projektów = nowa edycja, nie pozycja roadmapy „feature”. Zob.
[ADR 0005](./adr/0005-domain-axioms.md).
