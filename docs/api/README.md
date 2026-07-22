# API (REST + WebSocket)

Cienkie API wewnętrzne StageSync v5 — **własny JSON** + Zod na krawędziach,
nie JSON:API ([ADR 0006](../adr/0006-no-json-api.md)).

Schematy: `@stagesync/shared` (`ProjectSchema` v2, `TransportState`,
`TransportPlayBody`, `TransportLoadBody`, `TransportSeekBody`,
`TransportTickMessage`, …).  
Runtime data: `STAGESYNC_DATA_DIR` (domyślnie `data/`).

## REST

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/health` | Healthcheck |
| `GET` | `/api/library` | Indeks biblioteki (seed z template jeśli brak pliku) |
| `POST` | `/api/projects` | Utwórz projekt v2 seed (`{ name }`) |
| `GET` | `/api/projects/:id` | Odczyt pełnego `project.json` (v2; auto-upgrade v1→v2) |
| `PUT` | `/api/projects/:id` | **Pełny dokument** (bez `id`; z `updatedAt` klienta = OCC; mismatch → **409**; strict — unknown keys → 400) |
| `DELETE` | `/api/projects/:id` | Usuń projekt + wpis w indeksie |
| `GET` | `/api/transport` | Snapshot = kształt ticka (`transport_tick` + `serverTimeMs`) |
| `POST` | `/api/transport/play` | Play (+ opcjonalne `projectId`, `bpm`, `timeSignature`) |
| `POST` | `/api/transport/load` | Ustaw `activeProjectId`, apply mapy, bez play |
| `POST` | `/api/transport/pause` | Pause |
| `POST` | `/api/transport/seek` | Seek `{ positionTicks }`; po seek resolve map aktywnego projektu |

Sukces = dokument domenowy (library / project / **transport tick**).  
Błędy `400` / `404` / `409` / `500` → `{ ok: false, error, details? }`.  
`details` (opcjonalne): tablica `{ path, message, code? }` z Zod przy walidacji body.

### Project v2 (`ProjectSchema`)

Pola m.in.: `formatVersion: 2`, `ppq: 960`, `defaultBpm`, `defaultMeter`,
`forma.clips[]` (ticks), `tempoMap[]`, `meterMap[]`.  
Create seed: Countdown `startTicks: -7680`, Intro @ `0`.

### Transport (body / snapshot)

- **Play** (`TransportPlayBody`): opcjonalne `projectId`, `bpm`, `timeSignature`.
- **Load** (`TransportLoadBody`): wymagane `projectId`.
- **Seek** (`TransportSeekBody`): wymagane `positionTicks` (int).
- **REST + WS** odpowiadają kształtem `TransportTickMessage`: pola `TransportState` +
  `type: "transport_tick"` + `serverTimeMs` (+ opcjonalne `sentAtMs`) — soft-clock
  klienta porządkuje anchory względem ticków WS.

## WebSocket

| Ścieżka | Opis |
|---------|------|
| `/ws/transport` | Ticki transportu SSOT |

Wiadomość (`TransportTickMessage`): pola `TransportState` +
`type: "transport_tick"` + `serverTimeMs`.

Częstotliwość: ~25 Hz (`TRANSPORT_TICK_INTERVAL_MS` = 40) gdy `playing`;
snapshot także przy zmianie stanu (play / pause / seek / load).

Klient web: Vite proxy `/api` + `/ws`; playhead tylko między tickami serwera
([ADR 0002](../adr/0002-timebase-ssot.md)).
