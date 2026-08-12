import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchUgTabFromServer, searchUgTabs } from "./ugImportApi.js";

describe("ugImportApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetchUgTabFromServer POSTs url and parses response", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        content: "[Verse]\n[Am]Hi",
        metadata: {
          title: "Hi",
          artist: "A",
          type: "Chords",
          tonality: null,
          timeSignature: "4/4",
          tempo: null,
          tuning: null,
          tabId: 1,
          url: "https://tabs.ultimate-guitar.com/tab/a/hi-chords-1",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const data = await fetchUgTabFromServer(
      "https://tabs.ultimate-guitar.com/tab/a/hi-chords-1",
    );
    expect(data.content).toContain("[Am]");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/import/ultimate-guitar",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("searchUgTabs returns results", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        results: [
          {
            id: 1,
            title: "Hi",
            artist: "A",
            type: "Chords",
            rating: 5,
            url: "https://tabs.ultimate-guitar.com/tab/a/hi-chords-1",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const data = await searchUgTabs("Hi", "A");
    expect(data.results).toHaveLength(1);
    expect((fetchMock.mock.calls as any[])[0][0]).toBe(
      "/api/import/ultimate-guitar/search",
    );
  });

  it("surfaces API error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ ok: false, error: "Zablokowano" }, { status: 502 }),
      ),
    );
    await expect(
      fetchUgTabFromServer(
        "https://tabs.ultimate-guitar.com/tab/a/hi-chords-1",
      ),
    ).rejects.toThrow(/Zablokowano/);
  });
});
