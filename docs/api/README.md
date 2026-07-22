# API (REST + WebSocket)

Cienkie API wewnętrzne StageSync **v5** — własny JSON + Zod na krawędziach,
nie JSON:API ([ADR 0006](../adr/0006-no-json-api.md)).

Schematy: `@stagesync/shared` (`ProjectSchema` / `ProjectSchemaV5`,
`TransportState`, body transportu, `TransportTickMessage`, `StageCueMessage`,
MIDI host, setlista, …).  
Runtime data: `STAGESYNC_DATA_DIR` (domyślnie `data/`).

Źródło prawdy czasu: serwer ([ADR 0002](../adr/0002-timebase-ssot.md)).
Klient web: Vite proxy `/api` + `/ws`; playhead tylko między tickami serwera.

## Konwencje

- Sukces = dokument domenowy (library / project / transport tick / status).
- Błędy `400` / `403` / `404` / `409` / `413` / `500` / `501` / `502` →
  `{ ok: false, error, details? }`.
- `details` (opcjonalne): tablica `{ path, message, code? }` z Zod przy walidacji body.
- Nieznane ścieżki pod `/api/*` → **404** JSON (nie HTML SPA).
- Body JSON powyżej limitu (`express.json` ~2 MB) → **413** `Payload too large`.
- Upload pliku (assets) powyżej ~100 MB → **413** `File too large`.

## REST

### System / health

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/health` | `{ ok, service, version }` |
| `GET` | `/api/system/logs` | Ring-buffer logów hosta |
| `GET` | `/api/system/logs/stream` | SSE stream logów |
| `POST` | `/api/system/logs/clear` | Czyści ring-buffer |
| `GET` | `/api/system/network` | Adresy LAN, port, wersja, opcjonalnie `dataDir` |
| `GET` | `/api/system/update-status` | Porównanie wersji vs GitHub Releases (Docker); w shellu desktop — soft skip |
| `POST` | `/api/system/apply-update` | Trigger Watchtower (`STAGESYNC_UPDATER_*`); inaczej **501** |
| `POST` | `/api/system/restart` | Restart procesu (lifecycle); LAN wymaga tokenu / allow |
| `POST` | `/api/system/shutdown` | Shutdown procesu; LAN wymaga tokenu / allow |
| `GET` | `/api/system/diagnostics/export` | ZIP logów + meta (loopback lub host token) |

Restart / shutdown / diagnostics z LAN: `Authorization: Bearer …` lub
`X-Stagesync-Host-Token` = `STAGESYNC_HOST_TOKEN`, albo
`STAGESYNC_ALLOW_REMOTE_LIFECYCLE=1`. Loopback zawsze OK.

### Library

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/library` | Indeks biblioteki (cold-seed z template jeśli brak pliku) |
| `POST` | `/api/library/batch-midi-pc` | Batch `midiProgramId` po `assignments[]` |
| `POST` | `/api/library/export` | Pakiet JSON (`stagesyncExportVersion: 3`); opcjonalnie `projectIds` |
| `POST` | `/api/library/import` | Import pakietu / legacy → projekty **v5**; **201** `{ ok, created, format, warnings, library }` |

### Project

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `POST` | `/api/projects` | Utwórz projekt v5 seed (`{ name, fromTemplateId?, isTemplate? }`) → **201** |
| `GET` | `/api/projects/:id` | Pełny `project.json` (**v5**; auto-upgrade v1…v4→v5 przy odczycie) |
| `PUT` | `/api/projects/:id` | Pełny dokument bez `id`; `updatedAt` klienta = OCC → mismatch **409**; unknown keys → **400** |
| `DELETE` | `/api/projects/:id` | Usuń projekt + wpis w indeksie; czyści `activeProjectId` jeśli ten sam → **204** |

### Assets (per projekt)

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/projects/:id/assets` | `{ assets }` z projektu |
| `POST` | `/api/projects/:id/assets` | Multipart `file` (+ opcjonalne `trackId`); audio lub MusicXML → **201** pełny projekt |
| `DELETE` | `/api/projects/:id/assets/:assetId` | Usuń asset (+ powiązane clipy audio) → projekt |
| `GET` | `/api/projects/:id/assets/:assetId/file` | Strumień pliku (`Content-Type` z metadanych) |

### Setlist

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/setlist` | Widok setlisty + `activeProjectId` |
| `PUT` | `/api/setlist` | `{ enabled, projectIds }` → widok |
| `PATCH` | `/api/setlist/auto-advance` | `{ enabled }` → widok |

### Transport (SSOT)

Wszystkie odpowiedzi sukcesu = **`TransportTickMessage`** (stan + `type` +
`serverTimeMs` + zwykle `sentAtMs`) — ten sam zegar co WS.

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/transport` | Snapshot tick |
| `POST` | `/api/transport/play` | Play (`projectId?`, `bpm?`, `timeSignature?`) |
| `POST` | `/api/transport/load` | Ustaw `activeProjectId`, apply mapy, bez play (`projectId`) |
| `POST` | `/api/transport/pause` | Pause |
| `POST` | `/api/transport/stop` | Stop → home (Countdown / pre-roll gdy jest) |
| `POST` | `/api/transport/seek` | Seek `{ positionTicks }` |
| `POST` | `/api/transport/loop` | `{ enabled, startTicks?, endTicks? }` |

### Stage (scena)

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `POST` | `/api/stage/message` | Cue sceniczny → SSOT `sessionMessages` + broadcast WS `stage_cue`; **201** `{ …cue, messages }` |
| `GET` | `/api/stage/messages` | Aktywne komunikaty sesji: `{ messages: [...] }` |
| `DELETE` | `/api/stage/messages` | Wyczyść wszystkie → WS `stage_cue_dismiss` (`clearAll`) |
| `DELETE` | `/api/stage/messages/:id` | Usuń jeden → WS `stage_cue_dismiss` (`id`) |
| `GET` | `/api/stage/clients` | Presence: `{ clients: [...] }` z połączonych WS |

### MIDI (host / sidecar Node)

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/midi` | Status hosta (`MidiHostStatus`: ports, config, rates, `clockOutActive`) |
| `GET` | `/api/midi/devices` | Skrót: `available`, `backend`, `inputs`, `outputs`, `lastError` |
| `PUT` | `/api/midi/config` | `{ inputId?, outputId?, clockOutEnabled? }` → status |
| `POST` | `/api/midi/panic` | MUTE ALL: CC 120/121/123 na 16 kanałach wyjścia → `{ ok, sent, channels, status }` |

Bez MIDI w procesie Tauri ([ADR 0010](../adr/0010-desktop-shell-tauri.md)).

## Project v5 (`ProjectSchemaV5`)

Kanon: `formatVersion: 5`, `ppq: 960` (stała), `defaultBpm`, `defaultMeter`,
`forma` / `tempoMap` / `meterMap` / `keyMap`, lane’y `tekst` / `akordy` / `cue`,
`assets` / `audioTracks` / `audioClips`, `scoreBarMap`, opcjonalnie
`midiProgramId`, `isTemplate`, meta (`artist` / `genre` / `year` / `coverUrl`).

Create seed (`createProjectV5Seed`): Countdown w pre-rollu + Intro @ `0`.
Odczyt starszych plików: upgrade do v5 na krawędzi storage (shadow `.bak` przy
destrukcyjnym rewrite — patrz [INSTALL.md](../INSTALL.md)).

## Transport (body / snapshot)

- **Play** (`TransportPlayBody`): opcjonalne `projectId`, `bpm`, `timeSignature`.
- **Load** (`TransportLoadBody`): wymagane `projectId`.
- **Seek** (`TransportSeekBody`): wymagane `positionTicks` (int).
- **Loop** (`TransportLoopBody`): wymagane `enabled`; opcjonalne `startTicks` / `endTicks`.
- **Stan** (`TransportState`): `playing`, `positionTicks`, `bpm`, `timeSignature`,
  `ppq`, `activeProjectId` (`null` gdy brak), `loop` (`null` | zakres).

## WebSocket

| Ścieżka | Opis |
|--------|------|
| `/ws/transport` | Multiplex: ticki transportu + cue sceniczne; presence hello |

### Serwer → klient

Ramki (`TransportWsServerMessage` — discriminated na `type`):

1. **`transport_tick`** — pola `TransportState` + `serverTimeMs` (monotoniczny
   zegar silnika) + opcjonalne `sentAtMs` (wall-clock do EMA latency).
2. **`stage_cue`** — `{ id?, text, roles?, ttlMs, sentAtMs, priority? }` (po
   `POST /api/stage/message`; snapshot aktywnych przy nowym WS).
3. **`stage_cue_dismiss`** — `{ id? }` albo `{ clearAll: true }` + `sentAtMs`
   (po `DELETE /api/stage/messages…` lub TTL).
4. **`live_desk`** — snapshot Live Desk (transpose / sync-lead / remote edit).

Częstotliwość ticków: ~25 Hz (`TRANSPORT_TICK_INTERVAL_MS` = 40) gdy `playing`;
snapshot także przy zmianie stanu (play / pause / stop / seek / load / loop)
oraz przy pierwszym połączeniu.

Klient powinien **nie** traktować `stage_cue` / `stage_cue_dismiss` / `live_desk`
jako ticka. Parser `parseTransportTickPayload` toleruje legacy bare
`TransportState` (bez `type` / `serverTimeMs`) → coerce do ticka z
`serverTimeMs: 0`.

### Klient → serwer (presence)

Po otwarciu socketa klient może wysłać JSON:

```json
{ "type": "client_hello", "displayName": "…", "roles": ["karaoke"], "latencyMs": 12 }
```

(`ClientHelloMessageSchema`; role: `karaoke` | `grid` | `score` | `drums` | `timeline`, max 2).
Lista widoczna w `GET /api/stage/clients`. Limit ramki inbound ~8 KB.
