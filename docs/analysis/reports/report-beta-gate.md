# Beta gate — bramka przed `5.0.0-beta.1`

**Data:** 2026-07-21  
**Podstawa:** [report-scope-beta1.md](./report-scope-beta1.md) · [ADR 0004](../../docs/adr/0004-updates-docker.md) · [ADR 0010](../../docs/adr/0010-desktop-shell-tauri.md)

## Zasada

Tag i bump `5.0.0-beta.1` **dopiero po** green G1–G10 i jawnej prośbie operatora.  
Weryfikacja: instalatory z Release `v5.0.0-alpha.13` (G1–G5, G7–G10) oraz ścieżka updatera **α12 → α13** (G6).

## Checklista G1–G10

| ID | Kryterium | Status |
|----|-----------|--------|
| G1 | `.dmg` z GitHub Release `v5.0.0-alpha.13`: uruchamia aplikację i pokazuje Admin bez Dockera/Node u użytkownika | ⬜ |
| G2 | `.msi` z GitHub Release `v5.0.0-alpha.13`: instaluje i łączy się lokalnie bez Dockera/Node u użytkownika | ⬜ |
| G3 | Dane: po starcie `.dmg`/`.msi` runtime zapisuje do katalogu użytkownika (nie w `.app` / Program Files) | ⬜ |
| G4 | Zamknięcie okna Tauri: proces Node sidecara znika całkowicie (bez sierot) | ⬜ |
| G5 | Konflikt portu `4000`: aplikacja pokazuje czytelny komunikat błędu (nie biała WebView) | ⬜ |
| G6 | Desktop update: Admin w Tauri → Sprawdź → Aktualizuj aplikację → relaunch nowej wersji | ⬜ |
| G7 | Docker secondary: `compose.prod.yml up` + `GET /api/health` zwraca 200 | ⬜ |
| G8 | Host update (Docker secondary): starszy obraz → Admin Sprawdź → Aktualizuj host → nowa wersja, `data/` bez zmian; w przeglądarce bez Tauri desktop update nie jest przyciskiem | ⬜ |
| G9 | Docker rollback: poprzedni tag obrazu + `compose.prod.yml up` → stara wersja, `data/` bez zmian | ⬜ |
| G10 | Docs INSTALL + DESKTOP kompletne i zgodne z faktycznym flow | ⬜ |

## Przygotowanie lokalne (przed push / tag)

Wykonane lokalnie (2026-07-21):

- `node launch/scripts/build-desktop-sidecar.mjs --target aarch64-apple-darwin --smoke` → **green** (health OK, docs hygiene OK)
- `pnpm lint && pnpm check-types && pnpm test && pnpm build` → **green**
- Release `5.0.0-alpha.10` — tag @ `58c2998`, GitHub Release opublikowany 2026-07-21 ([CI run](https://github.com/Negatywistyczny/stagesync/actions/runs/29835599723) green)
- Release `5.0.0-alpha.11` — tag push 2026-07-21 (desktop shell polish + draft updater pipeline)
- Release `5.0.0-alpha.12` — tag push 2026-07-21 (OS menu Faza A + sidecar hotfix)
- Release `5.0.0-alpha.13` — tag push 2026-07-21 (Windows sidecar EISDIR hotfix); checklista G1–G10 **do ręcznej** weryfikacji (⬜ w tabeli)

## Sekwencja weryfikacji

1. Pobierz instalatory z GitHub Release `v5.0.0-alpha.13`:
   - `.dmg` → otwórz na macOS (unsigned, prawy klik → Otwórz). → **G1**
   - `.msi` → zainstaluj na Windows. → **G2**
2. Weryfikuj:
   - lokalne zapisanie do katalogu użytkownika → **G3**
   - zamknięcie okna Tauri usuwa Node sidecar → **G4**
   - konflikt portu `4000` daje czytelny komunikat → **G5**
3. **G6 (desktop update):** zainstaluj **alpha.12**, potem Admin → Aktualizuj aplikację → **alpha.13** (`latest.json` z Release).
4. Docker secondary:
   - `compose.prod.yml` z `STAGESYNC_VERSION=5.0.0-alpha.13` → `/api/health` → **G7**
   - host update: starszy obraz → Admin → Aktualizuj host → `data/` bez zmian → **G8**
   - rollback do poprzedniego tagu → **G9**
5. Przeczytaj INSTALL/DESKTOP — czy odpowiadają faktycznemu flow (menu OS Faza A + Windows EISDIR fix). → **G10**

## Ograniczenia beta

- Instalatory **unsigned** (brak notaryzacji Apple / cert EV Windows) — obejście w [DESKTOP.md](../../docs/DESKTOP.md).
- GHCR **prywatny** — operator potrzebuje PAT `read:packages` — instrukcja w [INSTALL.md](../../docs/INSTALL.md).
- Windows G2/G6: wymaga ręcznej maszyny Win (CI nie weryfikuje instalacji/relauch w środowisku operatora).
- Desktop update (G6): baseline **alpha.12** → cel **alpha.13** (oba tagi na GitHub Releases z `latest.json`).
- `workflow_dispatch` nie publikuje `latest.json` — pełny test G6 wymaga tag push (`v*`), nie dispatch.

## Następny krok operatora

1. Pobierz instalatory z [GitHub Release `v5.0.0-alpha.13`](https://github.com/Negatywistyczny/stagesync/releases/tag/v5.0.0-alpha.13) (G1–G5); dla G6 użyj też [alpha.12](https://github.com/Negatywistyczny/stagesync/releases/tag/v5.0.0-alpha.12) jako baseline.
2. Przejdź checklistę G1–G10 powyżej (oznacz status w tabeli); po green — bump `5.0.0-beta.1` **tylko na prośbę**.

## Po green G1–G10

```sh
# 1. Sync wersji
node launch/scripts/sync-version.mjs --version 5.0.0-beta.1

# 2. Zaktualizuj package.json + CHANGELOG (Unreleased → [5.0.0-beta.1])

# 3. Commit + tag
git add -A
git commit -m "chore(release): close 5.0.0-beta.1"
git tag v5.0.0-beta.1

# 4. Push → uruchamia release.yml z oficjalnymi artefaktami
git push && git push --tags
```
