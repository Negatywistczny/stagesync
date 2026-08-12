# ADR 0006 — Bez JSON:API

- **Status:** Zaakceptowany
- **Data:** 2026-07-20

## Kontekst

StageSync v5 ma cienkie REST + WebSocket API (biblioteka, projekty, transport).
[JSON:API](https://jsonapi.org/format/) narzuca kształt `data` / `attributes` /
`relationships` i konwencje paginacji — przydatne przy dużych publicznych API
z wieloma klientami, ale kosztowne przy alpha i małym kontrakcie wewnętrznym.

## Opcje rozważane

1. **JSON:API** — pełny dokument resource + compound documents.
2. **Własny JSON** — proste obiekty domenowe + Zod na krawędziach; błędy
   `{ ok: false, error }` (obecny kształt).

## Decyzja

Przyjmujemy opcję **2**. Nie implementujemy JSON:API.

- Response sukcesu = dokument domenowy (np. library / project / transport state)
  walidowany Zod w `@stagesync/shared`.
- Błędy HTTP: `{ ok: false, error }` (jak w [ARCHITECTURE](../ARCHITECTURE.md)).

## Konsekwencje

- Nie dodawać warstwy `data` / `attributes` / `type` „na zapas”.
- Zmiana na JSON:API (lub inny standard serializacji) wymaga **nowego ADR**
  i świadomego bumpa kontraktu klienta.
- Dokumentacja API (`docs/api`, gdy powstanie) opisuje faktyczny kształt, nie
  spekę JSON:API.
