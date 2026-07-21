# Beta gate — bramka przed / po `5.0.0-beta.1`

**Data:** 2026-07-21  
**Podstawa:** [report-scope-beta1.md](./report-scope-beta1.md) · [ADR 0004](../../docs/adr/0004-updates-docker.md) · [ADR 0010](../../docs/adr/0010-desktop-shell-tauri.md)

## Decyzja release (2026-07-21)

Tag `v5.0.0-beta.1` = **milestone dystrybucyjny** na jawną prośbę operatora:

- Must H1–H12 (Compose, Tauri sidecar, OCC, backup, ACL, CI packaging…) zrealizowane w **α10–α13**.
- Closeout w β1: docs + bump + Admin update-panel (#40).
- **G1–G10** pozostają **ręczną** weryfikacją operatora (nie zautomatyzowane w CI) — status poniżej nadal ⬜ do odhaczenia na instalatorach.
- **Menu OS Faza B** — carry → β2 ([TODO.md](../../TODO.md)).

## Checklista G1–G10

| ID | Kryterium | Status |
|----|-----------|--------|
| G1 | `.dmg` z GitHub Release: uruchamia aplikację i pokazuje Admin bez Dockera/Node u użytkownika | ⬜ |
| G2 | `.msi` z GitHub Release: instaluje i łączy się lokalnie bez Dockera/Node u użytkownika | ⬜ |
| G3 | Dane: po starcie `.dmg`/`.msi` runtime zapisuje do katalogu użytkownika (nie w `.app` / Program Files) | ⬜ |
| G4 | Zamknięcie okna Tauri: proces Node sidecara znika całkowicie (bez sierot) | ⬜ |
| G5 | Konflikt portu `4000`: aplikacja pokazuje czytelny komunikat błędu (nie biała WebView) | ⬜ |
| G6 | Desktop update: Admin w Tauri → Sprawdź → Aktualizuj aplikację → relaunch nowej wersji | ⬜ |
| G7 | Docker secondary: `compose.prod.yml up` + `GET /api/health` zwraca 200 | ⬜ |
| G8 | Host update (Docker secondary): starszy obraz → Admin Sprawdź → Aktualizuj host → nowa wersja, `data/` bez zmian; w przeglądarce bez Tauri desktop update nie jest przyciskiem | ⬜ |
| G9 | Docker rollback: poprzedni tag obrazu + `compose.prod.yml up` → stara wersja, `data/` bez zmian | ⬜ |
| G10 | Docs INSTALL + DESKTOP kompletne i zgodne z faktycznym flow (Faza A + update paths; Faza B = carry) | ⬜ |

**Baseline installers:** `v5.0.0-alpha.13` lub `v5.0.0-beta.1` (G1–G5, G7–G10).  
**G6 updater:** α13 → β1 (lub α12 → α13 jeśli testujesz starszą ścieżkę).

## Przygotowanie lokalne / CI (przed tagiem β1)

Wykonane (2026-07-21):

- Release `5.0.0-alpha.10`…`5.0.0-alpha.13` — desktop host stack + hotfixy
- CI na `main` po #40 (Admin update panel) — green
- Tag `v5.0.0-beta.1` — bump + docs closeout

## Sekwencja weryfikacji (operator)

1. Pobierz instalatory z [GitHub Release `v5.0.0-beta.1`](https://github.com/Negatywistyczny/stagesync/releases/tag/v5.0.0-beta.1) (lub α13):
   - `.dmg` → otwórz na macOS (unsigned, prawy klik → Otwórz). → **G1**
   - `.msi` → zainstaluj na Windows. → **G2**
2. Weryfikuj:
   - lokalne zapisanie do katalogu użytkownika → **G3**
   - zamknięcie okna Tauri usuwa Node sidecar → **G4**
   - konflikt portu `4000` daje czytelny komunikat → **G5**
3. **G6 (desktop update):** zainstaluj **alpha.13**, potem Admin → Aktualizuj aplikację → **beta.1** (`latest.json` z Release).
4. Docker secondary:
   - `compose.prod.yml` z `STAGESYNC_VERSION=5.0.0-beta.1` → `/api/health` → **G7**
   - host update: starszy obraz → Admin → Aktualizuj host → `data/` bez zmian → **G8**
   - rollback do poprzedniego tagu → **G9**
5. Przeczytaj INSTALL/DESKTOP — flow Faza A + updates + Windows EISDIR; Faza B jeszcze nie w menu. → **G10**

## Ograniczenia beta

- Instalatory **unsigned** (brak notaryzacji Apple / cert EV Windows) — obejście w [DESKTOP.md](../../docs/DESKTOP.md).
- GHCR **prywatny** — operator potrzebuje PAT `read:packages` — instrukcja w [INSTALL.md](../../docs/INSTALL.md).
- Windows G2/G6: wymaga ręcznej maszyny Win (CI nie weryfikuje instalacji/relauch w środowisku operatora).
- Desktop update (G6): wymaga tag push z `latest.json` (pełny publish Release).
- Jeśli Actions `github-release` padnie na limicie wydatków GitHub — dokończ publish ręcznie przez `gh` (jak przy α13).

## Po tagu β1

Aktywny etap w [TODO.md](../../TODO.md) = **β2** (audio + MIDI) + carry (menu Faza B, G1–G10).
