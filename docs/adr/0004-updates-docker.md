# ADR 0004 — Aktualizacje przez Docker (bez git-apply)

- **Status:** Zaakceptowany
- **Data:** 2026-07-19

## Kontekst

W StageSync **4.x** Admin mógł wykonać aktualizację na żądanie: `POST /api/system/apply-update` (git fetch tagu + merge + opcjonalnie `npm install` + restart). To wiązało runtime na scenie z brudnym working tree, częściowymi `node_modules` i ryzykiem półzaktualizowanego procesu w trakcie koncertu.

v5 celuje w **immutable deploy** (Docker) z danymi użytkownika na volume (`data/`).

## Decyzja

1. **Odrzucone:** aktualizacja z procesu aplikacji (git-apply / `apply-update` z panelu Admin).
2. **Przyjęte:** bump tagu obrazu kontenera (`stagesync:X.Y.Z`); `data/` (library, projects, logi) na **volume** — update nie kasuje utworów; rollback = poprzedni tag + restart.
3. **Admin UI:** pokazuje wersję oprogramowania; ewentualnie **informacyjny** „jest nowsza wersja” (link do release / registry) — **bez** przycisku wykonującego update.
4. Implementacja Compose / CI image — osobne zadania z [TODO](../TODO.md); ten ADR ustala kontrakt produktowy już przy szkielecie UI.

## Konsekwencje

- Nie dodawać endpointów ani UI „Zaktualizuj teraz” wzorowanych na 4.x.
- Migracje schematu przy starcie kontenera (gdy zajdą) są osobnym mechanizmem — nie `git pull`.
- Dokumentacja instalacji produkcyjnej wskazuje Docker + volume, nie `git clone` + apply z Admina.
