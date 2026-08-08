import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchUltrastarAccount,
  fetchUltrastarFromServer,
  putUltrastarAccount,
  searchUltrastarSongs,
  testUltrastarAccount,
} from "./ultrastarImportApi.js";

describe("ultrastarImportApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetchUltrastarFromServer POSTs url and parses response", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        content: "#TITLE:Hi\n#BPM:320\n: 0 4 0 Hi\nE\n",
        metadata: {
          title: "Hi",
          artist: "A",
          language: "English",
          songId: 1,
          url: "https://usdb.animux.de/?link=detail&id=1",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const data = await fetchUltrastarFromServer(
      "https://usdb.animux.de/?link=detail&id=1",
    );
    expect(data.content).toContain("#TITLE:Hi");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/import/ultrastar",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("searchUltrastarSongs returns results", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        results: [
          {
            id: 1,
            title: "Hi",
            artist: "A",
            language: "English",
            edition: null,
            rating: 5,
            url: "https://usdb.animux.de/?link=detail&id=1",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const data = await searchUltrastarSongs("Hi", "A");
    expect(data.results).toHaveLength(1);
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/import/ultrastar/search");
  });

  it("surfaces API error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { ok: false, error: "Brak konta USDB" },
          { status: 503 },
        ),
      ),
    );
    await expect(
      fetchUltrastarFromServer("https://usdb.animux.de/?link=detail&id=1"),
    ).rejects.toThrow(/Brak konta USDB/);
  });

  it("account GET/PUT/test call host endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ configured: false, user: "" }))
      .mockResolvedValueOnce(
        Response.json({
          ok: true,
          configured: true,
          user: "alice",
          message: "Zapisano",
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          ok: true,
          message: "Połączenie z USDB OK — dane logowania działają.",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchUltrastarAccount()).toEqual({
      configured: false,
      user: "",
    });
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/import/ultrastar/account");

    const saved = await putUltrastarAccount("alice", "secret");
    expect(saved.configured).toBe(true);
    expect(fetchMock.mock.calls[1]![1]).toMatchObject({ method: "PUT" });

    const tested = await testUltrastarAccount("alice", "secret");
    expect(tested.ok).toBe(true);
    expect(fetchMock.mock.calls[2]![0]).toBe(
      "/api/import/ultrastar/account/test",
    );
  });
});
