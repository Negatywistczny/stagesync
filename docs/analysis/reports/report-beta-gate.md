# Beta gate — bramka przed / po `5.0.0-beta.*`

**Data:** 2026-07-21  
**Podstawa:** [report-scope-beta1.md](./report-scope-beta1.md) · [report-scope-beta2.md](./report-scope-beta2.md) · [ADR 0004](../../adr/0004-updates-docker.md) · [ADR 0010](../../adr/0010-desktop-shell-tauri.md)

## Decyzja release

### `v5.0.0-beta.1` (2026-07-21) — milestone dystrybucyjny

Tag = closeout hosta na jawną prośbę operatora:

- Must H1–H12 (Compose, Tauri sidecar, OCC, backup, ACL, CI packaging…) zrealizowane w **α10–α13**.
- Closeout w β1: docs + bump + Admin update-panel (#40).
- **G1–G10** pozostają **ręczną** weryfikacją operatora (nie zautomatyzowane w CI) — status poniżej nadal ⬜.
- **Menu OS Faza B** — **nie** wdrożona w β1.

### `v5.0.0-beta.1.1` (2026-07-21) — docs cut

Uczciwy cut docs: residual β1 (**menu Faza B**, **G1–G10**) oraz **menu Faza C** = **must β2** przed tagiem `v5.0.0-beta.2` — nie soft carry. Scope: [report-scope-beta2.md](./report-scope-beta2.md).

### `v5.0.0-beta.2` (2026-07-21) — feature cut

Tag na jawną prośbę po merge feature PR (#44 Countdown, #45 MIDI, #47 menu B+C, #48 audio, #49 G6/`latest.json`+sidecar health, #46 docs):

- **Must kodu β2:** Audio 0…N, MIDI I/O serwera, menu Faza B+C, Countdown Stop, updater darwin+windows — **dostarczone**.
- **G1–G10:** nadal **⬜** — residual **operatorski** na HW przy cutcie (brak pełnego green na mac/Win przy tagu). Nie udajemy green.
- Krytyczne G1–G5 / G7: brak czerwonego raportu z HW; CI green na `main` + Release buduje instalatory.
- G6 ścieżka kodowa: `latest.json` z **darwin-aarch64 + windows-x86_64** (target `app` + merge platform) — weryfikacja flow relaunch = **Operator** po artefaktach β2 (baseline β1.1 → β2).
- Następny etap: **5.0.0** — [TODO.md](../../TODO.md); G1–G10 green = must przed / przy stable.

### `v5.0.0` (2026-07-23) — **Overture** (stable cut)

Tag na jawną prośbę po closeout kodu 5.0.0 na `main`:

- **Must kodu 5.0.0:** A–E + Faza D + OSMD/migration/wand + polish — **dostarczone**.
- **G1–G10:** nadal **⬜** — residual **operatorski** na HW przy cutcie (brak pełnego green na mac/Win przy tagu). Nie udajemy green.
- Krytyczne G1–G5 / G7: brak czerwonego raportu z HW; CI green na `main` + Release buduje instalatory `v5.0.0`.
- G6: baseline β2 → **5.0.0** po artefaktach Release; relaunch = **Operator**.
- Następny etap: **5.1+** — [TODO.md](../../TODO.md); G1–G10 pozostaje checklistą operatorską.

## Checklista G1–G10

| ID | Kryterium | Status | Weryfikacja |
|----|-----------|--------|-------------|
| G1 | `.dmg` z GitHub Release: uruchamia aplikację i pokazuje Admin bez Dockera/Node u użytkownika | ⬜ | **Operator** (macHW) — residual po `v5.0.0` |
| G2 | `.msi` z GitHub Release: instaluje i łączy się lokalnie bez Dockera/Node u użytkownika | ⬜ | **Operator** (WinHW) — residual po `v5.0.0` |
| G3 | Dane: po starcie `.dmg`/`.msi` runtime zapisuje do katalogu użytkownika (nie w `.app` / Program Files) | ⬜ | **Operator** |
| G4 | Zamknięcie okna Tauri: proces Node sidecara znika całkowicie (bez sierot) | ⬜ | **Operator** |
| G5 | Konflikt portu `4000`: aplikacja pokazuje czytelny komunikat błędu (nie biała WebView) | ⬜ | **Operator** |
| G6 | Desktop update: Admin w Tauri → Sprawdź → Aktualizuj aplikację → relaunch nowej wersji | ⬜ | **Operator** (pełny flow β1.1→β2); **CI/Release** = prerequisites poniżej |
| G7 | Docker secondary: `compose.prod.yml up` + `GET /api/health` zwraca 200 | ⬜ | **CI** częściowo (`compose-build`); pełny `up` + health = **Operator** / host |
| G8 | Host update (Docker secondary): starszy obraz → Admin Sprawdź → Aktualizuj host → nowa wersja, `data/` bez zmian; w przeglądarce bez Tauri desktop update nie jest przyciskiem | ⬜ | **Operator** |
| G9 | Docker rollback: poprzedni tag obrazu + `compose.prod.yml up` → stara wersja, `data/` bez zmian | ⬜ | **Operator** |
| G10 | Docs INSTALL + DESKTOP kompletne i zgodne z faktycznym flow (Faza A + B/C + update paths) | ⬜ | Docs B/C w DESKTOP — **Review**; smoke flow = **Operator** |

### Co CI / Release może zweryfikować (nie zastępuje G1–G10 na HW)

| Check | Gdzie |
|-------|--------|
| lint / types / unit tests / web+server build | workflow `CI` → `lint-types-test-build` |
| `cargo check` desktop | workflow `CI` → `tauri-cargo-check` |
| obraz Compose buduje się | workflow `CI` → `compose-build` |
| instalatory `.dmg` / `.msi` + sidecar smoke w Release | workflow `Release` (`tauri-macos` / `tauri-windows`) |
| `latest.json` zawiera **darwin-aarch64** + **windows-x86_64** | po publish: asset Release (target `app` + `dmg` na mac; `msi` na Win; Release zawsze `--latest`) |
| Release **nie** jest GitHub prerelease | `gh release view` → `isPrerelease: false` |

**Must kodu β2 (done przy tagu):** feature must (Audio / MIDI / menu B+C / Countdown) + CI green na `main` + fix updater (`app` target + `--latest` + sidecar health).  
**Must kodu 5.0.0 (done przy tagu `v5.0.0`):** A–E + Faza D + residual closeout — **dostarczone**.  
**Residual operatorskie po `v5.0.0`:** G1–G10 na HW z artefaktów `v5.0.0` — uczciwie ⬜ przy cutcie; bez claim green.

**Baseline installers:** `v5.0.0-beta.2` → **`v5.0.0`**.  
**G6 updater:** β2 → 5.0.0; kod: `latest.json` z **darwin + windows**.

## Przygotowanie lokalne / CI

Wykonane (2026-07-21):

- Release `5.0.0-alpha.10`…`5.0.0-alpha.13` — desktop host stack + hotfixy
- CI na `main` po #40 (Admin update panel) — green
- Tag `v5.0.0-beta.1` — bump + docs closeout
- Tag `v5.0.0-beta.1.1` — docs cut residual → must β2 + scope report β2
- Tag `v5.0.0-beta.2` — feature cut (#44–#49) + docs closeout → **5.0.0**
- Tag `v5.0.0` — **Overture** stable cut; G1–G10 nadal ⬜

## Sekwencja weryfikacji (operator)

1. Pobierz instalatory z [GitHub Release](https://github.com/Negatywistczny/stagesync/releases) (`v5.0.0`):
   - `.dmg` → otwórz na macOS (unsigned, prawy klik → Otwórz). → **G1**
   - `.msi` → zainstaluj na Windows. → **G2**
2. Weryfikuj:
   - lokalne zapisanie do katalogu użytkownika → **G3**
   - zamknięcie okna Tauri usuwa Node sidecar → **G4**
   - konflikt portu `4000` daje czytelny komunikat → **G5**
3. **G6 (desktop update):** zainstaluj **β2**, potem Admin → Aktualizuj aplikację → **5.0.0** (`latest.json` z Release; darwin+windows).
4. Docker secondary:
   - `compose.prod.yml` z `STAGESYNC_VERSION=…` → `/api/health` → **G7**
   - host update: starszy obraz → Admin → Aktualizuj host → `data/` bez zmian → **G8**
   - rollback do poprzedniego tagu → **G9**
5. Przeczytaj INSTALL/DESKTOP — flow Faza A–D + updates + Windows EISDIR. → **G10**

## Ograniczenia beta

- Instalatory **unsigned** (brak notaryzacji Apple / cert EV Windows) — obejście w [DESKTOP.md](../../DESKTOP.md).
- GHCR **prywatny** — operator potrzebuje PAT `read:packages` — instrukcja w [INSTALL.md](../../INSTALL.md).
- Windows G2/G6: wymaga ręcznej maszyny Win (CI nie weryfikuje instalacji/relauch w środowisku operatora).
- Desktop update (G6): wymaga tag push z `latest.json` (pełny publish Release).
- Jeśli Actions `github-release` padnie na limicie wydatków GitHub — dokończ publish ręcznie przez `gh` (jak przy α13).

## Po tagu `v5.0.0` (Overture)

Aktywny etap w [TODO.md](../../TODO.md) = **5.1+** + residual **G1–G10** operator.  
Scope kodu 5.0.0: [report-scope-5.0.0.md](./report-scope-5.0.0.md) — **wydane**.

| Reguła | Status |
|--------|--------|
| G1–G10 w tabeli powyżej | nadal **⬜** — **zakaz** odhaczania bez weryfikacji operatora |
| Must kodu 5.0.0 (A–E) | **done** w tagu `v5.0.0` |
| Claim „G green” w CHANGELOG / release notes | **Zakaz** do czasu sekwencji operatora |
| Artefakty do weryfikacji | Release [`v5.0.0`](https://github.com/Negatywistczny/stagesync/releases/tag/v5.0.0) (`.dmg` / `.msi` / `latest.json`); baseline updater z [`v5.0.0-beta.2`](https://github.com/Negatywistczny/stagesync/releases/tag/v5.0.0-beta.2) |

**Operator:** wykonaj „Sekwencja weryfikacji” powyżej na artefaktach `v5.0.0`. Dopiero wtedy G1–G10 → green w docs.
