# Beta gate — bramka przed `5.0.0-beta.1`

**Data:** 2026-07-21  
**Podstawa:** [report-scope-beta1.md](./report-scope-beta1.md) · [ADR 0004](../../docs/adr/0004-updates-docker.md) · [ADR 0010](../../docs/adr/0010-desktop-shell-tauri.md)

## Zasada

Tag i bump `5.0.0-beta.1` **dopiero po** green G1–G9 i jawnej prośbie operatora.  
Weryfikacja: uruchomić `workflow_dispatch` na `5.0.0-alpha.9` i przejść przez checklistę.

## Checklista G1–G9

| ID | Kryterium | Status |
|----|-----------|--------|
| G1 | `workflow_dispatch` na `alpha.9`: obraz w GHCR (`ghcr.io/negatywistczny/stagesync:5.0.0-alpha.9`) | ⬜ |
| G2 | `compose.prod.yml up` + `GET /api/health` zwraca 200 | ⬜ |
| G3 | `.dmg` pobrane z GitHub Release asset: otwiera WebView → Admin przy działającym hoście `:4000` | ⬜ |
| G4 | `.msi` pobrane z GitHub Release asset: instaluje i łączy z `:4000` | ⬜ |
| G5 | Host update: starszy obraz → Admin Sprawdź → Aktualizuj host → nowa wersja, `data/` bez zmian | ⬜ |
| G6 | Rollback: poprzedni tag obrazu + `compose.prod.yml up` → stara wersja, `data/` bez zmian | ⬜ |
| G7 | Desktop update (macOS): Admin w Tauri → Sprawdź → Aktualizuj aplikację → relaunch nowej wersji | ⬜ |
| G8 | Przeglądarka (bez Tauri): host update działa; zamiast „Aktualizuj aplikację" widać link do Releases | ⬜ |
| G9 | Docs INSTALL + DESKTOP kompletne i zgodne z faktycznym flow | ⬜ |

## Sekwencja weryfikacji

1. Push kodu (bez bumpu wersji) → CI zielone.
2. GitHub Actions → Release workflow → `workflow_dispatch` → `version: 5.0.0-alpha.9`.
3. Sprawdź GHCR: czy obraz dostępny po `docker login ghcr.io`. → **G1**
4. Uruchom `compose.prod.yml` z STAGESYNC_VERSION=5.0.0-alpha.9 → `/api/health`. → **G2**
5. Pobierz `.dmg` z Release assets → otwórz na macOS (unsigned, prawy klik → Otwórz). → **G3**
6. Pobierz `.msi` z Release assets → zainstaluj na Windows. → **G4**
7. Zbuduj kolejny testowy obraz z wersją `5.0.0-alpha.9-test2` (lub dispatch ponownie):
   - Ustaw starszy obraz w `.env` → uruchom Compose → otwórz Admin.
   - Kliknij Sprawdź → Aktualizuj host → obserwuj restart.
   - Sprawdź wersję po restarcie + `data/`. → **G5**
8. Rollback do starszego tagu → sprawdź. → **G6**
9. Zainstaluj starszą wersję `.dmg` (Tauri) → Sprawdź → Aktualizuj aplikację. → **G7**
10. Otwórz Admin w przeglądarce (http://localhost:4000/admin) → Sprawdź aktualizacje → brak przycisku desktop, jest link do Releases. → **G8**
11. Przeczytaj INSTALL/DESKTOP — czy odpowiadają faktycznemu flow. → **G9**

## Ograniczenia beta

- Instalatory **unsigned** (brak notaryzacji Apple / cert EV Windows) — obejście w [DESKTOP.md](../../docs/DESKTOP.md).
- GHCR **prywatny** — operator potrzebuje PAT `read:packages` — instrukcja w [INSTALL.md](../../docs/INSTALL.md).
- Windows G4/G7: wymaga ręcznej maszyny Win (CI nie builduje msi w compose health jobie).
- Desktop update (G7) wymaga dwóch różnych wersji buildów Tauri — przy pierwszym `alpha.9` test G7 jest N/A lub wymaga alpha.10.

## Po green G1–G9

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
