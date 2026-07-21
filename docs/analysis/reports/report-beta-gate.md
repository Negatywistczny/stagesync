# Beta gate — bramka przed `5.0.0-beta.1`

**Data:** 2026-07-21  
**Podstawa:** [report-scope-beta1.md](./report-scope-beta1.md) · [ADR 0004](../../docs/adr/0004-updates-docker.md) · [ADR 0010](../../docs/adr/0010-desktop-shell-tauri.md)

## Zasada

Tag i bump `5.0.0-beta.1` **dopiero po** green G1–G10 i jawnej prośbie operatora.  
Weryfikacja: uruchomić `workflow_dispatch` na `5.0.0-alpha.9` i przejść przez checklistę.

## Checklista G1–G10

| ID | Kryterium | Status |
|----|-----------|--------|
| G1 | `.dmg` pobrane z GitHub Release asset: uruchamia aplikację i pokazuje Admin bez Dockera/Node u użytkownika | ⬜ |
| G2 | `.msi` pobrane z GitHub Release asset: instaluje i łączy się lokalnie bez Dockera/Node u użytkownika | ⬜ |
| G3 | Dane: po starcie `.dmg`/`.msi` runtime zapisuje do katalogu użytkownika (nie w `.app` / Program Files) | ⬜ |
| G4 | Zamknięcie okna Tauri: proces Node sidecara znika całkowicie (bez sierot) | ⬜ |
| G5 | Konflikt portu `4000`: aplikacja pokazuje czytelny komunikat błędu (nie biała WebView) | ⬜ |
| G6 | Desktop update: Admin w Tauri → Sprawdź → Aktualizuj aplikację → relaunch nowej wersji | ⬜ |
| G7 | Docker secondary: `compose.prod.yml up` + `GET /api/health` zwraca 200 | ⬜ |
| G8 | Host update (Docker secondary): starszy obraz → Admin Sprawdź → Aktualizuj host → nowa wersja, `data/` bez zmian; w przeglądarce bez Tauri desktop update nie jest przyciskiem | ⬜ |
| G9 | Docker rollback: poprzedni tag obrazu + `compose.prod.yml up` → stara wersja, `data/` bez zmian | ⬜ |
| G10 | Docs INSTALL + DESKTOP kompletne i zgodne z faktycznym flow | ⬜ |

## Sekwencja weryfikacji

1. Push kodu (bez bumpu wersji) → CI zielone.
2. GitHub Actions → Release workflow → `workflow_dispatch` → `version: 5.0.0-alpha.9`.
3. Pobierz `.dmg` z Release assets → otwórz na macOS (unsigned, prawy klik → Otwórz). → **G1**
4. Pobierz `.msi` z Release assets → zainstaluj na Windows. → **G2**
5. Weryfikuj:
   - lokalne zapisanie do katalogu użytkownika → **G3**
   - zamknięcie okna Tauri usuwa Node sidecar → **G4**
   - konflikt portu `4000` daje czytelny komunikat → **G5**
6. Zbuduj kolejny testowy build desktop (testowa wersja z tego samego `dispatch` lub `alpha.9-test2`) i sprawdź:
   - Admin w Tauri → Sprawdź → Aktualizuj aplikację → relaunch → **G6**
7. Docker secondary:
   - `compose.prod.yml` z STAGESYNC_VERSION=5.0.0-alpha.9 → `/api/health` → **G7**
   - host update: starszy obraz → Admin → Aktualizuj host → `data/` bez zmian → **G8**
   - rollback do poprzedniego tagu → **G9**
8. Przeczytaj INSTALL/DESKTOP — czy odpowiadają faktycznemu flow. → **G10**

## Ograniczenia beta

- Instalatory **unsigned** (brak notaryzacji Apple / cert EV Windows) — obejście w [DESKTOP.md](../../docs/DESKTOP.md).
- GHCR **prywatny** — operator potrzebuje PAT `read:packages` — instrukcja w [INSTALL.md](../../docs/INSTALL.md).
- Windows G2/G6: wymaga ręcznej maszyny Win (CI nie weryfikuje instalacji/relauch w środowisku operatora).
- Desktop update (G6) wymaga dwóch różnych wersji buildów Tauri — przy pierwszym `alpha.9` test G6 jest N/A lub wymaga alpha.10.

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
