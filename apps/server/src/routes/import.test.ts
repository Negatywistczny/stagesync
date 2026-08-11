import { mkdtemp, rm } from "node:fs/promises";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";

vi.mock("../env-settings.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../system/env-settings.js")>();
  return {
    ...actual,
    writeManagedSettings: vi.fn((updates: Record<string, unknown>) => {
      for (const [key, rawValue] of Object.entries(updates)) {
        if (
          key === "STAGESYNC_USDB_PASS" &&
          (rawValue === undefined ||
            (typeof rawValue === "string" && rawValue.trim() === ""))
        ) {
          continue;
        }
        if (rawValue === null || rawValue === "") {
          delete process.env[key];
        } else {
          process.env[key] = String(rawValue);
        }
      }
      if (
        updates.STAGESYNC_USDB_USER === "" ||
        updates.STAGESYNC_USDB_USER === null
      ) {
        delete process.env.STAGESYNC_USDB_PASS;
      }
      return { values: {} as never, envExists: true };
    }),
  };
});

vi.mock("../ug/ug-fetch.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ug/ug-fetch.js")>();
  return {
    ...actual,
    fetchUgTab: vi.fn(async () => ({
      content: "[Verse]\n[Am]Hello\n\n[Chorus]\n[C]World",
      metadata: {
        title: "Test Song",
        artist: "Tester",
        type: "Chords",
        tonality: "A minor",
        timeSignature: "4/4",
        tempo: 120,
        tuning: "E A D G B E",
        tabId: 1,
        url: "https://tabs.ultimate-guitar.com/tab/tester/test-song-chords-1",
      },
    })),
    searchUgChords: vi.fn(async () => [
      {
        id: 1,
        title: "Test Song",
        artist: "Tester",
        type: "Chords",
        rating: 5,
        url: "https://tabs.ultimate-guitar.com/tab/tester/test-song-chords-1",
      },
    ]),
  };
});

vi.mock("../usdb/usdb-fetch.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../usdb/usdb-fetch.js")>();
  return {
    ...actual,
    fetchUsdbSong: vi.fn(async () => ({
      content: "#TITLE:Test Song\n#ARTIST:Tester\n#BPM:320\n: 0 4 0 Hi\nE\n",
      metadata: {
        title: "Test Song",
        artist: "Tester",
        language: "English",
        songId: 42,
        url: "https://usdb.animux.de/?link=detail&id=42",
      },
    })),
    searchUsdbSongs: vi.fn(async () => [
      {
        id: 42,
        title: "Test Song",
        artist: "Tester",
        language: "English",
        edition: null,
        rating: 5,
        url: "https://usdb.animux.de/?link=detail&id=42",
      },
    ]),
    loginUsdb: vi.fn(async () => "session=ok"),
  };
});

async function listen(
  dataDir: string,
): Promise<{ server: Server; baseUrl: string }> {
  const { app } = createApp({ dataDir, disableFileLogs: true });
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

describe("POST /api/import/ultimate-guitar", () => {
  let dataDir: string;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), "stagesync-ug-"));
    ({ server, baseUrl } = await listen(dataDir));
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await rm(dataDir, { recursive: true, force: true });
  });

  it("returns cleaned content + metadata for a valid URL body", async () => {
    const res = await fetch(`${baseUrl}/api/import/ultimate-guitar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://tabs.ultimate-guitar.com/tab/tester/test-song-chords-1",
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      content: string;
      metadata: { title: string };
    };
    expect(body.content).toContain("[Am]Hello");
    expect(body.metadata.title).toBe("Test Song");
  });

  it("rejects empty URL", async () => {
    const res = await fetch(`${baseUrl}/api/import/ultimate-guitar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("search returns hits", async () => {
    const res = await fetch(`${baseUrl}/api/import/ultimate-guitar/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Test", artist: "Tester" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      results: Array<{ url: string }>;
    };
    expect(body.results).toHaveLength(1);
    expect(body.results[0]!.url).toContain("ultimate-guitar.com");
  });

  it("search returns empty message when no hits", async () => {
    const { searchUgChords } = await import("../ug/ug-fetch.js");
    vi.mocked(searchUgChords).mockResolvedValueOnce([]);
    const res = await fetch(`${baseUrl}/api/import/ultimate-guitar/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Missing", artist: "Nobody" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      results: unknown[];
      message?: string;
    };
    expect(body.results).toEqual([]);
    expect(body.message).toMatch(/Brak wyników/i);
  });

  it("search rejects missing title", async () => {
    const res = await fetch(`${baseUrl}/api/import/ultimate-guitar/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ artist: "Tester" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/import/ultrastar", () => {
  let dataDir: string;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), "stagesync-us-"));
    ({ server, baseUrl } = await listen(dataDir));
  });

  afterEach(async () => {
    vi.clearAllMocks();
    delete process.env.STAGESYNC_USDB_USER;
    delete process.env.STAGESYNC_USDB_PASS;
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await rm(dataDir, { recursive: true, force: true });
  });

  it("returns UltraStar content + metadata for a valid USDB URL", async () => {
    const res = await fetch(`${baseUrl}/api/import/ultrastar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://usdb.animux.de/?link=detail&id=42",
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      content: string;
      metadata: { title: string; songId: number };
    };
    expect(body.content).toContain("#TITLE:Test Song");
    expect(body.metadata.title).toBe("Test Song");
    expect(body.metadata.songId).toBe(42);
  });

  it("rejects empty URL", async () => {
    const res = await fetch(`${baseUrl}/api/import/ultrastar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("search returns USDB hits", async () => {
    const res = await fetch(`${baseUrl}/api/import/ultrastar/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Test", artist: "Tester" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      results: Array<{ url: string }>;
    };
    expect(body.results).toHaveLength(1);
    expect(body.results[0]!.url).toContain("usdb.animux.de");
  });

  it("account GET/PUT/test persists credentials without returning password", async () => {
    const { loginUsdb } = await import("../usdb/usdb-fetch.js");

    const empty = await fetch(`${baseUrl}/api/import/ultrastar/account`);
    expect(empty.status).toBe(200);
    expect(await empty.json()).toEqual({ configured: false, user: "" });

    const put = await fetch(`${baseUrl}/api/import/ultrastar/account`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user: "alice", pass: "secret" }),
    });
    expect(put.status).toBe(200);
    const putBody = (await put.json()) as {
      ok: boolean;
      configured: boolean;
      user: string;
    };
    expect(putBody).toMatchObject({
      ok: true,
      configured: true,
      user: "alice",
    });
    expect(JSON.stringify(putBody)).not.toMatch(/secret/);

    const status = await fetch(`${baseUrl}/api/import/ultrastar/account`);
    expect(await status.json()).toEqual({ configured: true, user: "alice" });

    const keepPass = await fetch(`${baseUrl}/api/import/ultrastar/account`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user: "bob" }),
    });
    expect(keepPass.status).toBe(200);
    expect(process.env.STAGESYNC_USDB_PASS).toBe("secret");
    expect(process.env.STAGESYNC_USDB_USER).toBe("bob");

    const testRes = await fetch(
      `${baseUrl}/api/import/ultrastar/account/test`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      },
    );
    expect(testRes.status).toBe(200);
    expect(loginUsdb).toHaveBeenCalled();
    const testBody = (await testRes.json()) as { ok: boolean; message: string };
    expect(testBody.ok).toBe(true);
    expect(testBody.message).toMatch(/OK/i);

    const clear = await fetch(`${baseUrl}/api/import/ultrastar/account`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user: "" }),
    });
    expect(clear.status).toBe(200);
    expect(await clear.json()).toMatchObject({
      configured: false,
      user: "",
    });
  });
});
