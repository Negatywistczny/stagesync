# API (REST + WebSocket)

Cienkie API wewnętrzne StageSync v5 — **własny JSON** + Zod na krawędziach,
nie JSON:API ([ADR 0006](../adr/0006-no-json-api.md)).

Schematy: `@stagesync/shared` (`ProjectSchema` **v5**, `TransportState`,
`TransportPlayBody`, `TransportLoadBody`, `TransportSeekBody`,
`TransportLoopBody`, `TransportTickMessage`, setlist, MIDI config, …).  
Runtime data: `STAGESYNC_DATA_DIR` (domyślnie `data/`).

**Zamknięcie docs 5.0.0:** ten plik opisuje powierzchnię po β2 (+ pola audio fade
opcjonalne w schema clipu). Smoke: `apps/server/src/smoke-e2e.test.ts` (CI
`pnpm test`).

## Kontrakt błędów

Sukces = dokument domenowy (library / project / transport / …).  
Błędy `400` / `404` / `409` / `500` → `{ ok: false, error, details? }`.  
`details` (opcjonalne): tablica `{ path, message, code? }` z Zod przy walidacji body.  
PUT projektu: **OCC** — `updatedAt` klienta; mismatch → **409**.

## REST

### Health / system

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/health` | `{ ok, service, version }` |
| `GET` | `/api/system/network` | URL-e LAN (QR / klienci) |
| `GET` | `/api/system/logs` | Bufor logów hosta |
| `GET` | `/api/system/logs/stream` | SSE logów |
| `POST` | `/api/system/logs/clear` | Wyczyść bufor |
| `GET` | `/api/system/update-status` | Status aktualizacji (Docker / desktop) |
| `POST` | `/api/system/apply-update` | Zastosuj update (gdy dozwolone) |
| `POST` | `/api/system/restart` | Restart procesu (lifecycle; desktop/sidecar) |
| `POST` | `/api/system/shutdown` | Shutdown (lifecycle) |

### Library / projects

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/library` | Indeks biblioteki (seed z template jeśli brak) |
| `POST` | `/api/library/batch-midi-pc` | Batch MIDI Program Change |
| `POST` | `/api/library/export` | Eksport pack |
| `POST` | `/api/library/import` | Import pack |
| `POST` | `/api/projects` | Utwórz projekt v5 seed (`{ name }`) |
| `GET` | `/api/projects/:id` | Pełny `project.json` (auto-upgrade starszych formatów) |
| `PUT` | `/api/projects/:id` | Pełny dokument (bez `id`; OCC `updatedAt`; strict unknown keys → 400) |
| `DELETE` | `/api/projects/:id` | Usuń projekt + wpis w indeksie |

### Assets (pliki projektu)

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/projects/:id/assets` | Lista assetów |
| `POST` | `/api/projects/:id/assets` | Upload (`multipart` pole `file`) |
| `GET` | `/api/projects/:id/assets/:assetId/file` | Strumień pliku (audio / cover / MusicXML) |
| `DELETE` | `/api/projects/:id/assets/:assetId` | Usuń asset |

### Setlist

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/setlist` | Setlista + flaga auto-advance |
| `PUT` | `/api/setlist` | Zastąp listę (`enabled`, `projectIds`) |
| `PATCH` | `/api/setlist/auto-advance` | Włącz/wyłącz auto-advance |

### Transport (SSOT czasu — [ADR 0002](../adr/0002-timebase-ssot.md))

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/transport` | Snapshot transportu |
| `POST` | `/api/transport/play` | Play (+ opcjonalne `projectId`, `bpm`, `timeSignature`); Countdown / pre-roll wg projektu |
| `POST` | `/api/transport/load` | Ustaw `activeProjectId`, apply mapy, bez play |
| `POST` | `/api/transport/pause` | Pause |
| `POST` | `/api/transport/stop` | Stop → home (Countdown gdy obecny) |
| `POST` | `/api/transport/seek` | Seek `{ positionTicks }` |
| `POST` | `/api/transport/loop` | Region pętli transportu |

**Snapshot** (`TransportState`): `playing`, `positionTicks`, `bpm`, `timeSignature`,
`ppq`, `activeProjectId`, pola pętli wg schematu shared.

### Stage / klienci

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/stage/clients` | Lista klientów WS / obecności |
| `POST` | `/api/stage/message` | Wiadomość na scenę (broadcast) |

### MIDI (wyłącznie serwer — [ADR 0010](../adr/0010-desktop-shell-tauri.md))

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/midi` | Status hosta MIDI / clock |
| `GET` | `/api/midi/devices` | Lista urządzeń |
| `PUT` | `/api/midi/config` | Konfiguracja I/O (Zod) |

## Project schema (v5)

`formatVersion: 5`, `ppq: 960`, mapy Tempo/Metrum/Tonacja, Forma (ticks),
lane’y Tekst/Akordy/Cue, `assets` / `audioTracks` / `audioClips`.

**Audio clip (opcjonalne 5.0.0):** `fadeInMs`, `fadeOutMs`, `loop` — obok
`trimInMs` / `trimOutMs` / `gainDb` / `muted`. Fail-fast Zod; bez cichej naprawy.

Create seed: Countdown `startTicks` ujemne (pre-roll); treść od taktu 1 (`0` ticks).

## WebSocket

| Ścieżka | Opis |
|--------|------|
| `/ws/transport` | Ticki transportu SSOT |

Wiadomość (`TransportTickMessage`): pola `TransportState` +
`type: "transport_tick"` + `serverTimeMs`.

Częstotliwość: ~25 Hz (`TRANSPORT_TICK_INTERVAL_MS` = 40) gdy `playing`;
snapshot także przy zmianie stanu (play / pause / seek / load / stop).

Klient web: Vite proxy `/api` + `/ws`; playhead tylko między tickami serwera
([ADR 0002](../adr/0002-timebase-ssot.md)).

## Desktop shell

Tauri **nie** eksponuje REST — mostkuje menu OS → `stagesync:desktop-menu` w
WebView ([DESKTOP.md](../DESKTOP.md)). Autorytet czasu / MIDI = ten serwer.
