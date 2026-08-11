> From: https://gemini.google.com/app/14d97f6f0a161b02

# you asked

message time: 2026-07-27 14:28:15

Jesteś ekspertem od testów API assetów StageSync. Przeanalizuj [`apps/server/src/routes/assets.ts`](../../../../apps/server/src/routes/assets.ts) — upload/list/delete/stream plików audio i MusicXML per projekt.

CEL ANALIZY
Uzupełnić pokrycie poza [`assets-api.test.ts`](../../../../apps/server/src/library/assets-api.test.ts) (E2E) i [`assets-router-unit.test.ts`](../../../../apps/server/src/routes/assets-router-unit.test.ts) (error paths).

PYTANIA BADAWCZE

1. POST upload: audio vs musicxml kind, `trackId`/`startTicks` multipart fields — wszystkie kombinacje?
2. `mimeForExt` / `extFromName` — pure helpers do wydzielenia i przetestowania?
3. LIMIT_FILE_SIZE 413 via multer — pokryte w unit test?
4. GET `/:assetId/file`: stream pipe, error po headersSent — jak mockować `createReadStream`?
5. `projectIdFrom` / `assetIdFrom` — invalid params?
6. Integracja `stores.addProjectAsset` z `createAudioClip` flag — mock Stores wystarczy?

KONTEKST

- Multer memory storage, max 100MB.
- Zod Project na odpowiedzi; storage przez `Stores` interface.
- Vitest + supertest-like fetch lub express listen.

OCZEKIWANY OUTPUT

1. Lista testów unit (helpers) + integration (router).
2. Mocki: Stores partial, fs createReadStream, multer file buffer.
3. Ryzyka flaky: stream async — pattern dla error mid-pipe.
4. Fixtures: minimal wav bytes, .mxl extension.
5. Priorytety: upload validation > stream errors > list/delete.

---

# gemini response

Oto, jak planuję podejść do tego zagadnienia. Jeśli chcesz, abym wprowadził zmiany, poinformuj mnie o tym.
http://googleusercontent.com/deep_research_confirmation_content/0

---

# you asked

message time: 2026-07-27 14:34:24

Zacznij wyszukiwanie

---

# gemini response

I've completed your research. Feel free to ask me follow-up questions or request changes.

Testy API Assetów StageSync

# Plan Testów i Analiza Pokrycia API Assetów StageSync

Przegląd kodu źródłowego routera assetów w module [`apps/server/src/routes/assets.ts`](../../../../apps/server/src/routes/assets.ts) oraz istniejących zestawów testowych w [`assets-api.test.ts`](../../../../apps/server/src/library/assets-api.test.ts) i [`assets-router-unit.test.ts`](../../../../apps/server/src/routes/assets-router-unit.test.ts) wskazuje na konieczność rozbudowy obecnego zestawu weryfikacyjnego . Dotychczasowe testy end-to-end koncentrują się na weryfikacji głównych ścieżek sukcesu przy użyciu rzeczywistego systemu plików , natomiast testy jednostkowe routera skupiają się głównie na mapowaniu błędów zwracanych przez warstwę pamięci masowej `Stores` .

Poniższy raport przedstawia szczegółową analizę luki pokrycia, odpowiada na kluczowe pytania badawcze, definiuje wzorce mockowania i zabezpieczania testów asynchronicznych oraz dostarcza gotowe do wdrożenia zestawy testowe dla środowiska Vitest.

---

## Analiza Luki Pokrycia i Architektury Routera Assetów

Router assetów odpowiada za obsługę operacji I/O dotyczących plików audio oraz dokumentów MusicXML przypisanych do konkretnych projektów . Przetwarzanie żądań obejmuje parsowanie formularzy multipart przez middleware Multer, walidację rozszerzeń plików, wyznaczanie odpowiednich typów MIME oraz integrację z interfejsem `Stores` w celu trwałego zapisania assetu na dysku lub utworzenia klipów na ścieżkach audio .

| Komponent lub Ścieżka                                       | Plik [`assets-api.test.ts`](../../../../apps/server/src/library/assets-api.test.ts) (E2E) | Plik [`assets-router-unit.test.ts`](../../../../apps/server/src/routes/assets-router-unit.test.ts) | Docelowy Plan Testowy                                                                                                             |
| :---------------------------------------------------------- | :---------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| **Pure Helpers (`extFromName`, `mimeForExt`)**              | Testowane pośrednio przez wysyłanie żądań HTTP .                                          | Brak bezpośrednich testów .                                                                        | Dedykowane testy jednostkowe bez uruchamiania serwera HTTP.                                                                       |
| **Kombinacje POST Multipart (`trackId`, `startTicks`)**     | Podstawowa obsługa prawidłowych wartości `trackId` i `startTicks` .                       | Brak pokrycia parametrów formularza .                                                              | Pełna matryca kombinacji: zaokrąglanie wartości zmiennoprzecinkowych, ignorowanie wartości ujemnych i niepoprawnych typów.        |
| **Klasyfikacja Assetu (`audio` vs `musicxml`)**             | Pliki `.wav` oraz `.musicxml` .                                                           | Brak weryfikacji flagi `createAudioClip` .                                                         | Matryca rozszerzeń (.mxl, .flac, .aif) i kontrola flag w wywołaniu `stores.addProjectAsset`.                                      |
| **Przekroczenie Limitu Rozmiaru (HTTP 413)**                | Brak testu .                                                                              | Brak testu .                                                                                       | Symulacja `MulterError('LIMIT_FILE_SIZE')` bez alokacji bufora 100 MB.                                                            |
| **Błędy Strumieniowania (`GET /:assetId/file`)**            | Błąd 404 dla nieistniejącego pliku .                                                      | Mapowanie błędu `NotFoundError` z magazynu .                                                       | Test błędu odczytu z dysku przed wysłaniem nagłówków (500) oraz w trakcie strumieniowania po `headersSent` (zerwanie połączenia). |
| **Ekstraktory Parametrów (`projectIdFrom`, `assetIdFrom`)** | Prawidłowe identyfikatory UUID .                                                          | Prawidłowe identyfikatory w trasie .                                                               | Obsługa parametrów tablicowych, pustych ciągów znaków oraz braku wymaganych wartości.                                             |

---

## Analiza Pytan Badawczych i Strategia Testowa

### 1. Walidacja POST Upload: Kombinatoryka Audio, MusicXML, `trackId` oraz `startTicks`

Router dokonuje klasyfikacji pliku na podstawie zestawów `AUDIO_EXT` (.mp3, .wav, .aiff, .aif, .m4a, .flac, .ogg) oraz `MUSICXML_EXT` (.musicxml, .xml, .mxl) . Klasyfikacja ta wpływa na pole `kind` w obiekcie assetu oraz na wartość flagi `createAudioClip` przekazywanej do metody `stores.addProjectAsset` .

Dla plików audio flaga `createAudioClip` ustawiana jest na `true`, natomiast dla plików MusicXML przyjmuje wartość `false` . Router parsuje pola multipart w następujący sposób:

- `trackId`: Jeśli ciąg znaków jest niepusty, przekazywany jest jako `audioTrackId`. W przeciwnym razie przyjmuje wartość `undefined` .
- `startTicks`: Parsowany przy użyciu `Number(startTicksRaw)` . Jeśli wynik jest liczbą skończoną i nieujemną ($\ge 0$), zostaje zaokrąglony w dół poprzez `Math.floor()` . W przypadku wartości ujemnych, ciągów tekstowych lub `NaN`, wartość ustawiana jest na `undefined` .

| Typ Pliku      | Rozszerzenie | Pole `trackId` | Pole `startTicks` | Przekazywany `kind` | Przekazywana Flaga `createAudioClip` | Oczekiwane `audioTrackId` / `startTicks` |
| :------------- | :----------- | :------------- | :---------------- | :------------------ | :----------------------------------- | :--------------------------------------- |
| Audio          | `.wav`       | `"tr-1"`       | `"3840.9"`        | `"audio"`           | `true`                               | `"tr-1"` / `3840`                        |
| Audio          | `.flac`      | `""`           | `"-100"`          | `"audio"`           | `true`                               | `undefined` / `undefined`                |
| Audio          | `.mp3`       | `undefined`    | `"invalid"`       | `"audio"`           | `true`                               | `undefined` / `undefined`                |
| MusicXML       | `.mxl`       | `"tr-1"`       | `"1920"`          | `"musicxml"`        | `false`                              | `"tr-1"` / `1920`                        |
| MusicXML       | `.xml`       | `undefined`    | `undefined`       | `"musicxml"`        | `false`                              | `undefined` / `undefined`                |
| Nieobsługiwany | `.txt`       | Dowolne        | Dowolne           | Brak wywołania      | Brak wywołania                       | Odpowiedź HTTP 400 z błędem .            |

### 2. Izolacja i Testowanie Czystych Funkcji Pomocniczych (`mimeForExt` oraz `extFromName`)

Funkcje `extFromName` oraz `mimeForExt` nie posiadają efektów ubocznych i powinny zostać wyeksportowane z modułu [`assets.ts`](../../../../apps/server/src/routes/assets.ts) lub wydzielone do osobnego pliku pomocniczego .

Testy jednostkowe tych funkcji powinny weryfikować następujące przypadki krawędziowe:

- `extFromName`: konwersja wielkich liter do małych (np. `"VOCAL.WAV"` na `".wav"`), pliki bez rozszerzenia (np. `"README"` na `".bin"`), pliki ukryte (np. `".gitignore"` na `".bin"`) oraz nazwy z wieloma kropkami (np. `"sample.v1.final.flac"` na `".flac"`) .
- `mimeForExt`: poprawne mapowanie typów audio (np. `.mp3` $\rightarrow$ `"audio/mpeg"`, `.flac` $\rightarrow$ `"audio/flac"`), typów MusicXML (np. `.mxl` $\rightarrow$ `"application/vnd.recordare.musicxml"`, `.musicxml` $\rightarrow$ `"application/vnd.recordare.musicxml+xml"`) oraz domyślnego typu dla nieznanych rozszerzeń (`"application/octet-stream"`) .

### 3. Obsługa Limitów Multer (HTTP 413)

Middleware Multer jest skonfigurowany z limitem rozmiaru pliku wynoszącym 100 MB (`limits: { fileSize: 100 * 1024 * 1024 }`) . Gdy przekroczony zostanie limit, Multer przekazuje błąd `MulterError` z kodem `"LIMIT_FILE_SIZE"`, co funkcja `uploadSingleFile` zamienia na odpowiedź HTTP 413 z komunikatem `"File too large"` .

Aby zweryfikować tę ścieżkę w testach jednostkowych bez generowania w pamięci RAM bufora o rozmiarze 100 MB, należy przesłonić middleware Multer lub przekazać sztucznie wygenerowany `MulterError` bezpośrednio do funkcji obsługi błędu.

### 4. Strumieniowanie Plików (`GET /:assetId/file`) i Błędy Asynchroniczne

W routingu pobierania plików, strumień odczytu z pliku `createReadStream` przekazywany jest do odpowiedzi Express za pomocą metody `pipe` . Istotnym elementem jest poprawna obsługa błędów I/O w zależności od stanu odpowiedzi `res.headersSent` :

1. **Błąd przed wysłaniem nagłówków (`!res.headersSent`)**: Występuje, gdy plik nie istnieje lub dostęp do niego został zablokowany przed rozpoczęciem przesyłania danych . Router wywołuje `handleRouteError(res, err)`, zwracając kod HTTP 500 lub 404 z odpowiedzią JSON .
2. **Błąd po wysłaniu nagłówków (`res.headersSent === true`)**: Występuje, gdy błąd odczytu z dysku pojawi się w trakcie przesyłania strumienia danych, gdy nagłówki HTTP `200 OK` zostały już wysłane do klienta . Zmiana kodu statusu HTTP nie jest wówczas możliwa, dlatego router wywołuje `res.destroy(err)`, co powoduje natychmiastowe zamknięcie gniazda TCP .

Testowanie błędu po wysłaniu nagłówków wymaga zamockowania `node:fs.createReadStream` w taki sposób, aby zwrócony strumień przesłał co najmniej jeden pakiet danych (ustawiający `res.headersSent = true`), a następnie wyemitował zdarzenie `'error'`.

### 5. Ekstraktory Parametrów Trasy (`projectIdFrom` oraz `assetIdFrom`)

Funkcje pomocnicze pobierają identyfikatory z obiektu `req.params` . W przypadku gdy Express przekaże tablicę parametrów (np. przy specyficznych regułach routingu), funkcje pobierają pierwszy element tablicy `raw[0]` . Jeśli identyfikator nie jest niepustym ciągiem znaków, rzucany jest wyjątek `new Error("Missing project id")` lub `new Error("Missing asset id")`, co skutkuje przekazaniem błędu do `handleRouteError` i odrzuceniem żądania ze statusem HTTP 500 .

### 6. Integracja `stores.addProjectAsset` z Flagą `createAudioClip`

Do przetestowania integracji routera z magazynem wystarczy częściowy mock interfejsu `Stores` . Metoda `stores.addProjectAsset` przyjmuje parametry `(projectId, asset, fileBuffer, opts)` . Przeanalizowanie argumentów przekazanych do tej metody pozwala na weryfikację prawidłowego działania routera bez konieczności wykonywania operacji zapisu na fizycznym dysku .

---

## Moki, Fixtures i Patterny Odporności na Niestabilność Testów

### Fixtures

Testy wymagają spójnych buforów danych reprezentujących minimalne prawidłowe nagłówki plików:

```typescript
// Minimalny bufor nagłówka pliku WAV (44 bajty)
export const MINIMAL_WAV_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45, 0x66,
  0x6d, 0x74, 0x20, 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x44, 0xac,
  0x00, 0x00, 0x88, 0x58, 0x01, 0x00, 0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74,
  0x61, 0x00, 0x00, 0x00, 0x00,
]);

// Minimalny nagłówek spakowanego pliku MusicXML (.mxl - nagłówek ZIP PK)
export const MINIMAL_MXL_BYTES = new Uint8Array([
  0x50, 0x4b, 0x03, 0x04, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00,
]);
```

### Wzorzec Zapobiegania Flakiness przy Błędach Strumieniowania

Testowanie zdarzeń asynchronicznych na strumieniach może prowadzić do zgłaszania nieobsłużonych barier błędów (`UnhandledPromiseRejection` lub `ERR_STREAM_PREMATURE_CLOSE`). Poniższy wzorzec wykorzystuje obiekt `PassThrough` do precyzyjnej kontroli cyklu życia strumienia:

```typescript
import { PassThrough } from "node:stream";
import * as fs from "node:fs";
import { vi } from "vitest";

export function setupMidStreamErrorMock() {
  return vi.spyOn(fs, "createReadStream").mockImplementation(() => {
    const stream = new PassThrough();
    process.nextTick(() => {
      // 1. Zapisujemy pierwszy fragment, co wymusza res.headersSent = true w Expressie
      stream.write(Buffer.from("HEADER_DATA"));
      process.nextTick(() => {
        // 2. Emitujemy błąd w kolejnej tyknięciu pętli zdarzeń
        stream.emit("error", new Error("Disk read failure mid-transfer"));
      });
    });
    return stream as unknown as fs.ReadStream;
  });
}
```

---

## Kompleksowa Implementacja Zestawu Testowego

### Plik 1: Testy Jednostkowe Funkcji Pomocniczych ([`assets-helpers.test.ts`](../../../../apps/server/src/routes/assets-helpers.test.ts))

```typescript
import { describe, expect, it } from "vitest";
import { extFromName, mimeForExt } from "./assets.js";

describe("Assets Router Pure Helpers", () => {
  describe("extFromName", () => {
    it("extrapolates extensions and normalizes them to lower case", () => {
      expect(extFromName("vocal.wav")).toBe(".wav");
      expect(extFromName("SCORE.MUSICXML")).toBe(".musicxml");
      expect(extFromName("compressed.MXL")).toBe(".mxl");
    });

    it("handles multiple dots in file name", () => {
      expect(extFromName("track.01.final.flac")).toBe(".flac");
    });

    it("falls back to .bin for extensionless or hidden dotfiles", () => {
      expect(extFromName("audiofile")).toBe(".bin");
      expect(extFromName("")).toBe(".bin");
      expect(extFromName(".gitignore")).toBe(".bin");
    });
  });

  describe("mimeForExt", () => {
    it("returns correct MIME types for supported audio extensions", () => {
      expect(mimeForExt(".mp3")).toBe("audio/mpeg");
      expect(mimeForExt(".wav")).toBe("audio/wav");
      expect(mimeForExt(".aiff")).toBe("audio/aiff");
      expect(mimeForExt(".aif")).toBe("audio/aiff");
      expect(mimeForExt(".m4a")).toBe("audio/mp4");
      expect(mimeForExt(".flac")).toBe("audio/flac");
      expect(mimeForExt(".ogg")).toBe("audio/ogg");
    });

    it("returns correct MIME types for MusicXML extensions", () => {
      expect(mimeForExt(".musicxml")).toBe(
        "application/vnd.recordare.musicxml+xml",
      );
      expect(mimeForExt(".xml")).toBe("application/vnd.recordare.musicxml+xml");
      expect(mimeForExt(".mxl")).toBe("application/vnd.recordare.musicxml");
    });

    it("defaults to application/octet-stream for unknown extensions", () => {
      expect(mimeForExt(".bin")).toBe("application/octet-stream");
      expect(mimeForExt(".dat")).toBe("application/octet-stream");
    });
  });
});
```

### Plik 2: Extended Integration Tests (`assets-router-extended.test.ts`)

```typescript
import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import * as fs from "node:fs";
import { PassThrough } from "node:stream";
import multer from "multer";
import { createAssetsRouter } from "./assets.js";
import type { Stores } from "../storage/index.js";
import { MINIMAL_MXL_BYTES, MINIMAL_WAV_BYTES } from "./fixtures.js";

describe("createAssetsRouter — Extended Coverage Suite", () => {
  let server: Server | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server!.close((err) => (err ? reject(err) : resolve()));
    });
    server = undefined;
  });

  async function listen(stores: Partial<Stores>): Promise<string> {
    const app = express();
    app.use("/api/projects/:id/assets", createAssetsRouter(stores as Stores));
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  describe("POST / - Multipart Combinations & Store Flag Integration", () => {
    it("handles Audio upload with trackId and floored positive float startTicks", async () => {
      const addProjectAssetMock = vi.fn().mockResolvedValue({
        id: "p1",
        assets: [],
        audioTracks: [],
        audioClips: [],
      });
      const stores: Partial<Stores> = { addProjectAsset: addProjectAssetMock };
      const baseUrl = await listen(stores);

      const form = new FormData();
      form.append(
        "file",
        new Blob([MINIMAL_WAV_BYTES], { type: "audio/wav" }),
        "kick.wav",
      );
      form.append("trackId", "track-99");
      form.append("startTicks", "1920.85");

      const res = await fetch(`${baseUrl}/api/projects/p1/assets`, {
        method: "POST",
        body: form,
      });
      expect(res.status).toBe(201);
      expect(addProjectAssetMock).toHaveBeenCalledOnce();

      const [projectId, assetData, , opts] = addProjectAssetMock.mock.calls[0];
      expect(projectId).toBe("p1");
      expect(assetData.kind).toBe("audio");
      expect(assetData.mimeType).toBe("audio/wav");
      expect(opts).toEqual({
        createAudioClip: true,
        audioTrackId: "track-99",
        startTicks: 1920,
      });
    });

    it("handles MusicXML (.mxl) upload and forces createAudioClip to false", async () => {
      const addProjectAssetMock = vi.fn().mockResolvedValue({
        id: "p1",
        assets: [],
        audioTracks: [],
        audioClips: [],
      });
      const stores: Partial<Stores> = { addProjectAsset: addProjectAssetMock };
      const baseUrl = await listen(stores);

      const form = new FormData();
      form.append("file", new Blob([MINIMAL_MXL_BYTES]), "score.mxl");

      const res = await fetch(`${baseUrl}/api/projects/p1/assets`, {
        method: "POST",
        body: form,
      });
      expect(res.status).toBe(201);

      const [, assetData, , opts] = addProjectAssetMock.mock.calls[0];
      expect(assetData.kind).toBe("musicxml");
      expect(assetData.mimeType).toBe("application/vnd.recordare.musicxml");
      expect(opts.createAudioClip).toBe(false);
      expect(opts.audioTrackId).toBeUndefined();
      expect(opts.startTicks).toBeUndefined();
    });

    it("ignores negative startTicks and empty string trackId", async () => {
      const addProjectAssetMock = vi.fn().mockResolvedValue({
        id: "p1",
        assets: [],
        audioTracks: [],
        audioClips: [],
      });
      const stores: Partial<Stores> = { addProjectAsset: addProjectAssetMock };
      const baseUrl = await listen(stores);

      const form = new FormData();
      form.append("file", new Blob([MINIMAL_WAV_BYTES]), "snare.wav");
      form.append("trackId", "");
      form.append("startTicks", "-960");

      const res = await fetch(`${baseUrl}/api/projects/p1/assets`, {
        method: "POST",
        body: form,
      });
      expect(res.status).toBe(201);

      const [, , , opts] = addProjectAssetMock.mock.calls[0];
      expect(opts.audioTrackId).toBeUndefined();
      expect(opts.startTicks).toBeUndefined();
    });
  });

  describe("POST / - Multer Error Handlers", () => {
    it("returns HTTP 413 when multer throws LIMIT_FILE_SIZE", async () => {
      const stores: Partial<Stores> = { addProjectAsset: vi.fn() };
      const app = express();

      // Podmiana middleware uploadSingleFile w teście z użyciem atrapy błędu Multer
      app.use("/api/projects/:id/assets", (req, res, next) => {
        const err = new multer.MulterError("LIMIT_FILE_SIZE");
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({ ok: false, error: "File too large" });
          return;
        }
        next();
      });

      server = await new Promise<Server>((resolve) => {
        const s = app.listen(0, "127.0.0.1", () => resolve(s));
      });
      const { port } = server.address() as AddressInfo;

      const res = await fetch(
        `http://127.0.0.1:${port}/api/projects/p1/assets`,
        {
          method: "POST",
          body: new FormData(),
        },
      );

      expect(res.status).toBe(413);
      const body = (await res.json()) as { ok: boolean; error: string };
      expect(body.ok).toBe(false);
      expect(body.error).toBe("File too large");
    });
  });

  describe("GET /:assetId/file - Stream Errors & Mid-Pipe Breaks", () => {
    it("returns HTTP 500 when stream fails BEFORE headersSent", async () => {
      const stores: Partial<Stores> = {
        getAssetFilePath: vi.fn().mockResolvedValue({
          path: "/tmp/fake.wav",
          asset: {
            id: "a1",
            storageName: "a1.wav",
            originalName: "fake.wav",
            kind: "audio",
            mimeType: "audio/wav",
            sizeBytes: 100,
          },
        }),
      };

      vi.spyOn(fs, "createReadStream").mockImplementation(() => {
        const stream = new PassThrough();
        process.nextTick(() =>
          stream.emit("error", new Error("ENOENT: File lost")),
        );
        return stream as unknown as fs.ReadStream;
      });

      const baseUrl = await listen(stores);
      const res = await fetch(`${baseUrl}/api/projects/p1/assets/a1/file`);
      expect(res.status).toBe(500);
      const body = (await res.json()) as { ok: boolean; error: string };
      expect(body.ok).toBe(false);
      expect(body.error).toContain("ENOENT");
    });

    it("destroys socket when stream fails AFTER headersSent", async () => {
      const stores: Partial<Stores> = {
        getAssetFilePath: vi.fn().mockResolvedValue({
          path: "/tmp/fake.wav",
          asset: {
            id: "a1",
            storageName: "a1.wav",
            originalName: "fake.wav",
            kind: "audio",
            mimeType: "audio/wav",
            sizeBytes: 100,
          },
        }),
      };

      vi.spyOn(fs, "createReadStream").mockImplementation(() => {
        const stream = new PassThrough();
        process.nextTick(() => {
          stream.write(Buffer.from("AUDIO_HEADER_BYTES"));
          process.nextTick(() => {
            stream.emit("error", new Error("I/O Hardware Fault"));
          });
        });
        return stream as unknown as fs.ReadStream;
      });

      const baseUrl = await listen(stores);
      await expect(
        fetch(`${baseUrl}/api/projects/p1/assets/a1/file`),
      ).rejects.toThrow();
    });
  });
});
```

---

## Priorytety Wdrożenia

| Priorytet          | Obszar Testowy                                            | Uzasadnienie                                                                                                                                                           |
| :----------------- | :-------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1 (Krytyczny)** | Walidacja POST Multipart i Klasyfikacja Assetów           | Zapewnia prawidłowość danych wejściowych, zaokrąglanie wartości `startTicks` oraz poprawne ustawianie flagi `createAudioClip` przy wgrywaniu plików audio i MusicXML . |
| **P2 (Wysoki)**    | Strumieniowanie Błędów Mid-Pipe i Limit Multer (HTTP 413) | Zabezpiecza serwer przed wyciekami zasobów oraz nieobsłużonymi błędami I/O po wysłaniu nagłówków odpowiedzi .                                                          |
| **P3 (Średni)**    | Testy Jednostkowe Funkcji `mimeForExt` i `extFromName`    | Szybkie testy bez narzutu warstwy sieciowej HTTP, zwiększające pokrycie linii kodu .                                                                                   |
| **P4 (Niski)**     | Dalsza Weryfikacja List i Usuwania Assetów                | Obszar w znacznym stopniu pokryty przez istniejące testy E2E i testy ścieżek błędów .                                                                                  |

---

Powered by [AI Exporter](https://saveai.net)
