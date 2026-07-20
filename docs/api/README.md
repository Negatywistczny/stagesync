# API (REST + WebSocket)

Cienkie API wewnętrzne StageSync v5 — **własny JSON** + Zod na krawędziach,
nie JSON:API ([ADR 0006](../adr/0006-no-json-api.md)).

Schematy: `@stagesync/shared` (`TransportState`, `TransportPlayBody`,
`TransportSeekBody`, `TransportTickMessage`, …).  
Runtime data: `STAGESYNC_DATA_DIR` (domyślnie `data/`).

## REST

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/health` | Healthcheck |
| `GET` | `/api/library` | Indeks biblioteki (seed z template jeśli brak pliku) |
| `POST` | `/api/projects` | Utwórz projekt (`{ name }`) |
| `GET` | `/api/projects/:id` | Odczyt `project.json` |
| `PUT` | `/api/projects/:id` | Aktualizacja (`{ name? }`) |
| `DELETE` | `/api/projects/:id` | Usuń projekt + wpis w indeksie |
| `GET` | `/api/transport` | Snapshot transportu SSOT |
| `POST` | `/api/transport/play` | Play (+ opcjonalne `bpm` / `timeSignature`) |
| `POST` | `/api/transport/pause` | Pause |
| `POST` | `/api/transport/seek` | Seek `{ positionTicks }` |

Sukces = dokument domenowy (library / project / transport state).  
Błędy `400` / `404` / `500` → `{ ok: false, error }`.

### Transport (body)

- **Play** (`TransportPlayBody`): opcjonalne `bpm`, `timeSignature` (`numerator` /
  `denominator`).
- **Seek** (`TransportSeekBody`): wymagane `positionTicks` (int).
- **Snapshot** (`TransportState`): `playing`, `positionTicks`, `bpm`,
  `timeSignature`, `ppq`.

## WebSocket

| Ścieżka | Opis |
|---------|------|
| `/ws/transport` | Ticki transportu SSOT |

Wiadomość (`TransportTickMessage`): pola `TransportState` +
`type: "transport_tick"` + `serverTimeMs`.

Częstotliwość: ~25 Hz (`TRANSPORT_TICK_INTERVAL_MS` = 40) gdy `playing`;
snapshot także przy zmianie stanu (play / pause / seek).

Klient web: Vite proxy `/api` + `/ws`; playhead tylko między tickami serwera
([ADR 0002](../adr/0002-timebase-ssot.md)).
