# Beta gate — bramka przed `5.0.0-beta.1`

**Data:** 2026-07-21  
**Podstawa:** [report-scope-beta1.md](./report-scope-beta1.md) · [ADR 0004](../../docs/adr/0004-updates-docker.md) · [ADR 0010](../../docs/adr/0010-desktop-shell-tauri.md)

## Zasada

Tag i bump `5.0.0-beta.1` **dopiero po** green G1–G10 i jawnej prośbie operatora.  
Weryfikacja: push tag `v5.0.0-alpha.10` i przejście przez checklistę na artefaktach Release.

## Checklista G1–G10

| ID | Kryterium | Status |
|----|-----------|--------|
| G1 | `.dmg` z GitHub Release `v5.0.0-alpha.10`: uruchamia aplikację i pokazuje Admin bez Dockera/Node u użytkownika | ⬜ |
| G2 | `.msi` z GitHub Release `v5.0.0-alpha.10`: instaluje i łączy się lokalnie bez Dockera/Node u użytkownika | ⬜ |
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
- Release `5.0.0-alpha.10` — tag @ `58c2998`, GitHub Release opublikowany 2026-07-21

**CI Release (tag push):** [workflow run](https://github.com/Negatywistczny/stagesync/actions/runs/29835599723) — `docker-ghcr`, `tauri-macos-dmg`, `tauri-windows-msi`, `github-release` **green**. Artefakty: `StageSync_5.0.0-alpha.10_aarch64.dmg`, `StageSync_5.0.0-alpha.10_x64_en-US.msi` (+ `SHA256SUMS.txt`). Checklista G1–G10 pozostaje **do ręcznej** weryfikacji operatora (⬜ w tabeli).

## Sekwencja weryfikacji

1. `git push origin main` → CI zielone.
2. `git tag v5.0.0-alpha.10 && git push origin v5.0.0-alpha.10` → Release workflow (GHCR + GitHub Release + `.dmg`/`.msi`).
3. Pobierz instalatory z GitHub Release `v5.0.0-alpha.10`:
   - `.dmg` → otwórz na macOS (unsigned, prawy klik → Otwórz). → **G1**
   - `.msi` → zainstaluj na Windows. → **G2**
4. Weryfikuj:
   - lokalne zapisanie do katalogu użytkownika → **G3**
   - zamknięcie okna Tauri usuwa Node sidecar → **G4**
   - konflikt portu `4000` daje czytelny komunikat → **G5**
5. **G6 (desktop update):** zainstaluj alpha.10, następnie tag `v5.0.0-alpha.11` z `latest.json` → Admin → Aktualizuj aplikację → relaunch.
6. Docker secondary:
   - `compose.prod.yml` z `STAGESYNC_VERSION=5.0.0-alpha.10` → `/api/health` → **G7**
   - host update: starszy obraz → Admin → Aktualizuj host → `data/` bez zmian → **G8**
   - rollback do poprzedniego tagu → **G9**
7. Przeczytaj INSTALL/DESKTOP — czy odpowiadają faktycznemu flow. → **G10**

## Ograniczenia beta

- Instalatory **unsigned** (brak notaryzacji Apple / cert EV Windows) — obejście w [DESKTOP.md](../../docs/DESKTOP.md).
- GHCR **prywatny** — operator potrzebuje PAT `read:packages` — instrukcja w [INSTALL.md](../../docs/INSTALL.md).
- Windows G2/G6: wymaga ręcznej maszyny Win (CI nie weryfikuje instalacji/relauch w środowisku operatora).
- Desktop update (G6): baseline **alpha.10** zainstalowane → pełny test updater wymaga tagu **alpha.11** (dwa buildy z `latest.json` na GitHub Releases).
- `workflow_dispatch` nie publikuje `latest.json` — pełny test G6 wymaga tag push (`v*`), nie dispatch.

## Następny krok operatora

1. Pobierz instalatory z [GitHub Release `v5.0.0-alpha.10`](https://github.com/Negatywistczny/stagesync/releases/tag/v5.0.0-alpha.10).
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
