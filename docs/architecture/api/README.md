> [📦 StageSync](../../../README.md) / [docs](../../README.md) / [architecture](../README.md)

# 🔌 api/ — Specyfikacja REST API & WebSockets

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

| Metoda | Ścieżka                          | Opis                                                                                                                                                                                                                                                                                           |
| ------ | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/health`                    | `{ ok, service, version, protocolVersion, uiHash, uiHashPerformer?, uiHashConsole?, themeDefault? }` — `protocolVersion` = kompatybilność ramek WS/API; `uiHash` = hash pełnego `apps/web` dist; role hashes = Offline-First dla APK; `themeDefault` = `STAGESYNC_THEME_DEFAULT` gdy ustawione |
| `GET`  | `/api/ui-manifest`               | `{ protocolVersion, uiHash, assets[] }` — lista plików UI z hashami; `?role=performer\|console` = manifest paczki roli                                                                                                                                                                         |
| `GET`  | `/api/system/logs`               | Ring-buffer logów hosta                                                                                                                                                                                                                                                                        |
| `GET`  | `/api/system/logs/stream`        | SSE stream logów                                                                                                                                                                                                                                                                               |
| `POST` | `/api/system/logs/clear`         | Czyści ring-buffer                                                                                                                                                                                                                                                                             |
| `GET`  | `/api/system/network`            | Adresy LAN, port, wersja, opcjonalnie `dataDir`                                                                                                                                                                                                                                                |
| `GET`  | `/api/system/settings`           | Zarządzane wartości `.env` (Admin Ustawienia; loopback/token); sekrety (np. hasło USDB) zamaskowane — `secretsConfigured`                                                                                                                                                                      |
| `PUT`  | `/api/system/settings`           | Zapis zarządzanych kluczy do `.env` (`{dataDir}/host/.env` przy `STAGESYNC_DATA_DIR`)                                                                                                                                                                                                          |
| `GET`  | `/api/system/browse`             | Picker katalogów / plików (repo + home); `?mode=file&ext=.bak` lub `.bak,.zip`                                                                                                                                                                                                                 |
| `POST` | `/api/system/restore`            | Przywróć `.bak` / wiele `.bak` (`paths[]`, max 64) / archiwum `.zip` do drzewa danych (`confirm: true`); PIN + ACL lifecycle; przed nadpisaniem `pre-restore`                                                                                                                                  |
| `GET`  | `/api/system/update-status`      | Porównanie wersji vs GitHub Releases (Docker); w shellu desktop — soft skip                                                                                                                                                                                                                    |
| `POST` | `/api/system/apply-update`       | Trigger Watchtower (`STAGESYNC_UPDATER_*`); inaczej **501**                                                                                                                                                                                                                                    |
| `GET`  | `/api/system/operator-auth`      | `{ required }` — czy host ma `STAGESYNC_OPERATOR_PIN`                                                                                                                                                                                                                                          |
| `POST` | `/api/system/operator-auth`      | `{ pin }` — weryfikacja PIN (**200** / **403**); bez mutacji stanu                                                                                                                                                                                                                             |
| `GET`  | `/api/system/safety-net`         | `{ role }` — Master / Spare (`STAGESYNC_SAFETY_ROLE`)                                                                                                                                                                                                                                          |
| `POST` | `/api/system/promote`            | Ręczne Przejmij: Spare → Master; gdy transport `PLAYING` → `PAUSE` (`transportPaused: true`)                                                                                                                                                                                                   |
| `POST` | `/api/system/restart`            | Restart procesu (lifecycle); LAN wymaga tokenu / allow                                                                                                                                                                                                                                         |
| `POST` | `/api/system/shutdown`           | Shutdown procesu; LAN wymaga tokenu / allow                                                                                                                                                                                                                                                    |
| `GET`  | `/api/system/diagnostics/export` | ZIP logów + meta (loopback lub host token)                                                                                                                                                                                                                                                     |

Restart / shutdown / diagnostics z LAN: `Authorization: Bearer …` lub
`X-Stagesync-Host-Token` = `STAGESYNC_HOST_TOKEN`, albo
`STAGESYNC_ALLOW_REMOTE_LIFECYCLE=1`. Loopback zawsze OK.

Gdy ustawiony `STAGESYNC_OPERATOR_PIN`, destrukcyjne mutacje REST wymagają
`X-Stagesync-Operator-Pin` (alias `X-StageSync-PIN`). Wyjątki bez PIN-u:
transport `play`/`pause`/`stop`/`seek`/`loop`, MIDI panic, restart/shutdown
(własny ACL).

### Downloads (sideload / UI bundle)

| Metoda       | Ścieżka                              | Opis                                                                                 |
| ------------ | ------------------------------------ | ------------------------------------------------------------------------------------ |
| `GET`/`HEAD` | `/downloads/stagesync-performer.apk` | APK Performer (auto: downloads dir / bundel produktu; 404 plain text gdy brak)       |
| `GET`/`HEAD` | `/downloads/stagesync-console.apk`   | APK Console (jw.)                                                                    |
| `GET`/`HEAD` | `/downloads/ui-bundle.zip`           | Pełna paczka `apps/web` dist (`uiHash`); wymaga `STAGESYNC_STATIC_DIR` z buildem web |
| `GET`/`HEAD` | `/downloads/ui-bundle-performer.zip` | Client-only UI dla StageSync Performer (`uiHashPerformer`)                           |
| `GET`/`HEAD` | `/downloads/ui-bundle-console.zip`   | Pełne SPA UI dla StageSync Console (`uiHashConsole`)                                 |

### Library

| Metoda | Ścieżka                      | Opis                                                                                                                                  |
| ------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/library`               | Indeks biblioteki (cold-seed z template jeśli brak pliku)                                                                             |
| `POST` | `/api/library/batch-midi-pc` | Batch `midiProgramId` po `assignments[]`                                                                                              |
| `POST` | `/api/library/export`        | Pakiet JSON (`stagesyncExportVersion: 3`); opcjonalnie `projectIds`                                                                   |
| `POST` | `/api/library/import`        | Import pakietu v5 (`{ projects }`) → projekty; **201** `{ ok, created, format, warnings, library }`; format 4.x (`songs[]`) → **400** |

### Import (Ultimate Guitar)

| Metoda | Ścieżka                              | Opis                                                                                                                    |
| ------ | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/api/import/ultimate-guitar`        | `{ url }` — pobranie zakładki Chords z UG (serwer); `{ content, metadata }` (treść już wyczyszczona pod `importUgText`) |
| `POST` | `/api/import/ultimate-guitar/search` | `{ title, artist? }` — wyszukiwarka (max 25 wyników Chords)                                                             |

### Import (UltraStar / USDB)

| Metoda | Ścieżka                         | Opis                                                                                                                                                                                                       |
| ------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/import/ultrastar/account` | `{ configured, user }` — status konta USDB na hoście (bez hasła)                                                                                                                                           |
| `PUT`  | `/api/import/ultrastar/account` | `{ user, pass? }` — zapis konta do zarządzanego `.env` hosta (`{STAGESYNC_DATA_DIR}/host/.env` gdy ustawione; inaczej `.env` w root repo) (puste `user` = usuń; puste/`pass` pominięte = bez zmiany hasła) |

| `POST` | `/api/import/ultrastar/account/test` | `{ user?, pass? }` — test logowania USDB (override lub zapisane dane) |
| `POST` | `/api/import/ultrastar` | `{ url }` — pobranie `.txt` UltraStar z USDB; wymaga konta USDB (UI lub `STAGESYNC_USDB_*`) |
| `POST` | `/api/import/ultrastar/search` | `{ title, artist? }` — wyszukiwarka USDB (max 25 wyników) |

Konto USDB: zalecany zapis z UI (Import UltraStar → Konto USDB / Ustawienia serwera).
Te same klucze `STAGESYNC_USDB_USER` / `STAGESYNC_USDB_PASS` w zarządzanym `.env`
(`{dataDir}/host/.env` przy `STAGESYNC_DATA_DIR`, inaczej root repo) lub env procesu;
przy starcie już ustawione process env wygrywa z plikiem `.env`. Zapis z UI aktualizuje runtime od razu.

### Project

| Metoda   | Ścieżka             | Opis                                                                                                                                                                                         |
| -------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/api/projects`     | Utwórz projekt v5 seed (`{ name, fromTemplateId?, isTemplate? }`) → **201**                                                                                                                  |
| `GET`    | `/api/projects/:id` | Pełny [`project.json`](../../../apps/desktop/src-tauri/resources/sidecar/seed/seed-projects/00000000-0000-4000-8000-000000000001/project.json) (**v5**; auto-upgrade v1…v4→v5 przy odczycie) |
| `PUT`    | `/api/projects/:id` | Pełny dokument bez `id`; `updatedAt` klienta = OCC → mismatch **409**; unknown keys → **400**                                                                                                |
| `DELETE` | `/api/projects/:id` | Usuń projekt + wpis w indeksie; czyści `activeProjectId` jeśli ten sam → **204**                                                                                                             |

### Assets (per projekt)

| Metoda   | Ścieżka                                  | Opis                                                                                  |
| -------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `GET`    | `/api/projects/:id/assets`               | `{ assets }` z projektu                                                               |
| `POST`   | `/api/projects/:id/assets`               | Multipart `file` (+ opcjonalne `trackId`); audio lub MusicXML → **201** pełny projekt |
| `DELETE` | `/api/projects/:id/assets/:assetId`      | Usuń asset (+ powiązane clipy audio) → projekt                                        |
| `GET`    | `/api/projects/:id/assets/:assetId/file` | Strumień pliku (`Content-Type` z metadanych)                                          |

### Setlist

| Metoda  | Ścieżka                     | Opis                               |
| ------- | --------------------------- | ---------------------------------- |
| `GET`   | `/api/setlist`              | Widok setlisty + `activeProjectId` |
| `PUT`   | `/api/setlist`              | `{ enabled, projectIds }` → widok  |
| `PATCH` | `/api/setlist/auto-advance` | `{ enabled }` → widok              |

### Transport (SSOT)

Wszystkie odpowiedzi sukcesu = **`TransportTickMessage`** (stan + `type` +
`serverTimeMs` + zwykle `sentAtMs`) — ten sam zegar co WS.

| Metoda | Ścieżka                | Opis                                                        |
| ------ | ---------------------- | ----------------------------------------------------------- |
| `GET`  | `/api/transport`       | Snapshot tick                                               |
| `POST` | `/api/transport/play`  | Play (`projectId?`, `bpm?`, `timeSignature?`)               |
| `POST` | `/api/transport/load`  | Ustaw `activeProjectId`, apply mapy, bez play (`projectId`) |
| `POST` | `/api/transport/pause` | Pause                                                       |
| `POST` | `/api/transport/stop`  | Stop → home (Countdown / pre-roll gdy jest)                 |
| `POST` | `/api/transport/seek`  | Seek `{ positionTicks }`                                    |
| `POST` | `/api/transport/loop`  | `{ enabled, startTicks?, endTicks? }`                       |

### Stage (scena)

| Metoda   | Ścieżka                   | Opis                                                                                            |
| -------- | ------------------------- | ----------------------------------------------------------------------------------------------- |
| `POST`   | `/api/stage/message`      | Cue sceniczny → SSOT `sessionMessages` + broadcast WS `stage_cue`; **201** `{ …cue, messages }` |
| `GET`    | `/api/stage/messages`     | Aktywne komunikaty sesji: `{ messages: [...] }`                                                 |
| `DELETE` | `/api/stage/messages`     | Wyczyść wszystkie → WS `stage_cue_dismiss` (`clearAll`)                                         |
| `DELETE` | `/api/stage/messages/:id` | Usuń jeden → WS `stage_cue_dismiss` (`id`)                                                      |
| `GET`    | `/api/stage/clients`      | Presence: `{ clients: [...] }` z połączonych WS                                                 |

### MIDI (host / sidecar Node)

| Metoda | Ścieżka             | Opis                                                                                                                                                                              |
| ------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/midi`         | Status hosta (`MidiHostStatus`: ports, config, rates, `clockOutActive`)                                                                                                           |
| `GET`  | `/api/midi/devices` | Skrót: `available`, `backend`, `inputs`, `outputs`, `lastError`                                                                                                                   |
| `PUT`  | `/api/midi/config`  | `{ inputId?, outputId?, clockOutEnabled?, inputChannel?, outputChannel? }` → status (`inputChannel` / `outputChannel`: `null` = Omni IN / domyślny OUT; `0…15` = kanał 1–16 w UI) |
| `POST` | `/api/midi/panic`   | MUTE ALL: CC 120/121/123 na 16 kanałach wyjścia → `{ ok, sent, channels, status }`                                                                                                |

Bez MIDI w procesie Tauri ([ADR 0010](../adr/0010-desktop-shell-tauri.md)).

## Project v5 (`ProjectSchemaV5`)

Kanon: `formatVersion: 5`, `ppq: 960` (stała), `defaultBpm`, `defaultMeter`,
`forma` / `tempoMap` / `meterMap` / `keyMap`, lane’y `tekst` / `akordy` / `cue`,
`assets` / `audioTracks` / `audioClips`, `scoreBarMap`, opcjonalnie
`midiProgramId`, `isTemplate`, meta (`artist` / `genre` / `year` / `coverUrl`).

Create seed (`createProjectV5Seed`): Countdown w pre-rollu + Intro @ `0`.
Odczyt starszych plików: upgrade do v5 na krawędzi storage (../guides/INSTALL.md)).

## Transport (body / snapshot)

- **Play** (`TransportPlayBody`): opcjonalne `projectId`, `bpm`, `timeSignature`.
- **Load** (`TransportLoadBody`): wymagane `projectId`.
- **Seek** (`TransportSeekBody`): wymagane `positionTicks` (int).
- **Loop** (`TransportLoopBody`): wymagane `enabled`; opcjonalne `startTicks` / `endTicks`.
- **Stan** (`TransportState`): `playing`, `positionTicks`, `bpm`, `timeSignature`,
  `ppq`, `activeProjectId` (`null` gdy brak), `loop` (`null` | zakres).

## WebSocket

| Ścieżka         | Opis                                                        |
| --------------- | ----------------------------------------------------------- |
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
jako ticka. Parser `parseTransportTickPayload` wymaga pełnej koperty
`transport_tick` (z `type` + `serverTimeMs`).

### Klient → serwer (presence)

Po otwarciu socketa klient może wysłać JSON:

```json
{
  "type": "client_hello",
  "displayName": "…",
  "roles": ["karaoke"],
  "latencyMs": 12
}
```

(`ClientHelloMessageSchema`; role: `karaoke` | `grid` | `score` | `drums` | `timeline`, max 2).
Lista widoczna w `GET /api/stage/clients`. Limit ramki inbound ~8 KB.
