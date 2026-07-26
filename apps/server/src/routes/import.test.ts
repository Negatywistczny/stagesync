import { mkdtemp, rm } from "node:fs/promises";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";

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
});
