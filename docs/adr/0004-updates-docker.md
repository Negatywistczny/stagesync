# ADR 0004 — Aktualizacje przez Docker (bez git-apply)

- **Status:** Zaakceptowany (amendement 2026-07-21)
- **Data:** 2026-07-19

## Kontekst

W StageSync **4.x** Admin mógł wykonać aktualizację na żądanie: `POST /api/system/apply-update` (git fetch tagu + merge + opcjonalnie `npm install` + restart). To wiązało runtime na scenie z brudnym working tree, częściowymi `node_modules` i ryzykiem półzaktualizowanego procesu w trakcie koncertu.

v5 celuje w **immutable deploy** (Docker) z danymi użytkownika na volume (`data/`).

## Decyzja

1. **Odrzucone na zawsze:** git-apply — aktualizacja przez `git fetch` / merge / `npm install` w procesie aplikacji. Nigdy nie wróci.
2. **Przyjęte:** bump tagu obrazu kontenera (`stagesync:X.Y.Z`); `data/` (library, projects, logi) na **volume** — update nie kasuje utworów; rollback = poprzedni tag + restart.
3. **Admin UI (amendement β1):** „Sprawdź aktualizacje" na żądanie — porównuje bieżącą wersję z GitHub Releases API i pozwala uruchomić update hosta przez Watchtower HTTP. Szczegóły: [ADR 0010](./0010-desktop-shell-tauri.md) (desktop) i [INSTALL.md](../INSTALL.md).
4. Implementacja Compose / CI image — [INSTALL.md](../INSTALL.md).

## Amendement 2026-07-21 — update na żądanie z Admina

Oryginalna decyzja nr 3 mówiła „bez przycisku wykonującego update". Rozróżnienie, które wyjaśnia zmianę:

| Model 4.x (OUT) | Model v5 (IN) |
|-----------------|---------------|
| git-apply w runtime (`git fetch` + merge + `npm install`) | Trigger immutable pull: Watchtower HTTP API → `docker pull` + recreate |
| Mutacja working tree na scenie | Nowy obraz z rejestru; `data/` na volume bez zmian |
| Ryzyko półzaktualizowanego procesu | Krótka przerwa WS (kontener restart), rollback = poprzedni tag |

**Dozwolone od β1:**
- `GET /api/system/update-status` — porównanie semver (current vs GitHub Releases latest)
- `POST /api/system/apply-update` z `{ target: "host" }` — **wyłącznie** trigger Watchtower HTTP; nie git, nie `npm install`, nie mutacja FS
- Przycisk „Aktualizuj host" w Adminie po potwierdzeniu operatora (nie auto-poll w tle)
- Tauri updater na żądanie z Admina (minisign, nie podpis OS): patrz [ADR 0010](./0010-desktop-shell-tauri.md)

**Nadal OUT:**
- git-apply / `git clone` z Admina
- Auto-update w tle bez decyzji operatora (β2+)
- Kanały testowe / sklepy OS (β2+)

## Konsekwencje

- Endpoint `POST /api/system/apply-update` wraca, ale **wyłącznie** jako proxy do Watchtower — bez logiki git.
- Bez skonfigurowanego Watchtower (dev `pnpm dev`): endpoint zwraca `501`.
- Migracje schematu przy starcie kontenera — osobny mechanizm, nie `git pull`.
- Dokumentacja instalacji produkcyjnej wskazuje `compose.prod.yml` + Watchtower, nie `git clone` + apply.
