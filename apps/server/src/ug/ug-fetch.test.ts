import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildFetchResult,
  extractDataContentJson,
  extractTabId,
  fetchUgTab,
  getPageData,
  hasUgTabPayload,
  isCloudflareChallenge,
  isUgNotFound,
  isValidUgTabUrl,
  normalizeUgMetadata,
  parseUgSearchResults,
  parseUgUrlSlug,
  searchUgChords,
} from "./ug-fetch.js";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures/ug-tab-sample.json",
);
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;

const TAB_URL =
  "https://tabs.ultimate-guitar.com/tab/gloria-gaynor/i-will-survive-chords-180013";

function encodeUgPayload(payload: unknown): string {
  return JSON.stringify(payload)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
}

function ugTabHtml(payload: unknown, reverseAttrs = false): string {
  const encoded = encodeUgPayload(payload);
  if (reverseAttrs) {
    return `<div data-content="${encoded}" class="js-store"></div>`;
  }
  return `<div class="js-store" data-content="${encoded}"></div>`;
}

function chordsPageData(title = "Song", type = "Chords"): unknown {
  return {
    store: {
      page: {
        data: {
          tab: { song_name: title, artist_name: "Artist", type, id: 9 },
          tab_view: {
            wiki_tab: { content: "[tab][Verse]\n[ch]C[/ch]line[/tab]" },
          },
        },
      },
    },
  };
}

describe("ug-fetch helpers", () => {
  it("isValidUgTabUrl accepts tabs.ultimate-guitar.com chord URLs", () => {
    expect(
      isValidUgTabUrl(
        "https://tabs.ultimate-guitar.com/tab/gloria-gaynor/i-will-survive-chords-180013",
      ),
    ).toBe(true);
    expect(isValidUgTabUrl("https://example.com/tab/x")).toBe(false);
    expect(isValidUgTabUrl("")).toBe(false);
  });

  it("extractTabId and parseUgUrlSlug read slug + id", () => {
    const url =
      "https://tabs.ultimate-guitar.com/tab/gloria-gaynor/i-will-survive-chords-180013";
    expect(extractTabId(url)).toBe(180013);
    expect(parseUgUrlSlug(url)).toEqual({
      artist: "gloria gaynor",
      song: "i will survive",
    });
    expect(parseUgUrlSlug("https://tabs.ultimate-guitar.com/tab/x")).toBeNull();
  });

  it("extractDataContentJson reads js-store payload", () => {
    const payload = { store: { page: { data: { tab: { song_name: "X" } } } } };
    const html = ugTabHtml(payload);
    const raw = extractDataContentJson(html);
    expect(getPageData(raw)?.tab?.song_name).toBe("X");
  });

  it("extractDataContentJson reads reverse attribute order", () => {
    const payload = { store: { page: { data: { tab: { song_name: "Rev" } } } } };
    const raw = extractDataContentJson(ugTabHtml(payload, true));
    expect(getPageData(raw)?.tab?.song_name).toBe("Rev");
  });

  it("hasUgTabPayload / Cloudflare / not-found detectors", () => {
    expect(
      hasUgTabPayload('<div class="js-store" data-content="{}"></div>'),
    ).toBe(true);
    expect(hasUgTabPayload("<html></html>")).toBe(false);
    expect(
      isCloudflareChallenge("Just a moment... cf-browser-verification"),
    ).toBe(true);
    expect(isUgNotFound("Oops!", 200)).toBe(true);
    expect(isUgNotFound("ok", 404)).toBe(true);
    expect(isUgNotFound("ok tab content", 200)).toBe(false);
  });

  it("normalizeUgMetadata maps tuning object and tempo", () => {
    const meta = normalizeUgMetadata(
      {
        tab: { song_name: "Song", artist_name: "Artist", type: "Chords", id: 9 },
        tab_view: {
          meta: {
            tonality: "C",
            tempo: "120",
            time_signature: "3/4",
            tuning: { value: "E A D G B E" },
          },
        },
      },
      "https://tabs.ultimate-guitar.com/tab/a/b-chords-9",
    );
    expect(meta.title).toBe("Song");
    expect(meta.artist).toBe("Artist");
    expect(meta.tempo).toBe(120);
    expect(meta.timeSignature).toBe("3/4");
    expect(meta.tuning).toBe("E A D G B E");
    expect(meta.tabId).toBe(9);
  });

  it("buildFetchResult accepts fixture chords tab and cleans [ch]", () => {
    const pageData = getPageData(fixture);
    expect(pageData).not.toBeNull();
    const result = buildFetchResult(
      pageData!,
      "https://tabs.ultimate-guitar.com/tab/gloria-gaynor/i-will-survive-chords-1086983",
    );
    expect(result.metadata.title).toBe("I Will Survive");
    expect(result.content).toContain("[Am]");
    expect(result.content).not.toMatch(/\[ch\]/i);
    expect(result.content).toContain("[Verse]");
  });

  it("buildFetchResult decodes Latin entities and drops tip notes", () => {
    const result = buildFetchResult(
      {
        tab: { song_name: "Test", artist_name: "A", type: "Chords", id: 1 },
        tab_view: {
          wiki_tab: {
            content:
              "[tab][Verse]\n[ch]Am[/ch]U st&oacute;p\n\n[Outro]\n[ch]E[/ch]\n*you can play E7 instead of E throughout the whole song[/tab]",
          },
        },
      },
      "https://tabs.ultimate-guitar.com/tab/a/b-chords-1",
    );
    expect(result.content).toContain("U stóp");
    expect(result.content).not.toMatch(/&oacute;/i);
    expect(result.content).not.toMatch(/you can play E7/i);
  });

  it("buildFetchResult rejects non-chords tab type", () => {
    expect(() =>
      buildFetchResult(
        {
          tab: { song_name: "Solo", type: "Guitar Pro" },
          tab_view: { wiki_tab: { content: "[tab]x[/tab]" } },
        },
        "https://tabs.ultimate-guitar.com/tab/a/b-chords-1",
      ),
    ).toThrow(/tylko zakładki typu Chords/i);
  });

  it("parseUgSearchResults filters pro/marketing and ranks artist", () => {
    const raw = {
      store: {
        page: {
          data: {
            results: [
              {
                id: 1,
                song_name: "A",
                artist_name: "Foo",
                type: "Chords",
                votes: 10,
                tab_url: "https://tabs.ultimate-guitar.com/tab/foo/a-chords-1",
              },
              {
                id: 2,
                song_name: "Pro",
                artist_name: "Foo",
                type: "Pro",
                votes: 99,
              },
              {
                id: 3,
                song_name: "Ad",
                artist_name: "Foo",
                type: "Chords",
                marketing_type: "ad",
                votes: 50,
              },
              {
                id: 4,
                song_name: "B",
                artist_name: "Other",
                type: "Chords",
                votes: 20,
              },
            ],
          },
        },
      },
    };
    const all = parseUgSearchResults(raw);
    expect(all.map((r) => r.id)).toEqual([1, 4]);
    const foo = parseUgSearchResults(raw, "foo");
    expect(foo).toHaveLength(1);
    expect(foo[0]!.song_name).toBe("A");
  });
});

function jsStoreHtml(payload: unknown): string {
  const encoded = JSON.stringify(payload)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
  return `<html><div class="js-store" data-content="${encoded}"></div></html>`;
}

describe("ug-fetch async", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("fetchUgTab rejects invalid URL", async () => {
    await expect(fetchUgTab("https://example.com/x")).rejects.toThrow(
      /Nieprawidłowy URL/i,
    );
  });

  it("fetchUgTab returns chords tab from js-store HTML", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(jsStoreHtml(fixture), {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      ),
    );
    const result = await fetchUgTab(TAB_URL);
    expect(result.metadata.title).toBe("I Will Survive");
    expect(result.content).toContain("[Am]");
  });

  it("fetchUgTab maps 403 and Cloudflare to blocked message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("Just a moment... cf-browser-verification", {
          status: 200,
        }),
      ),
    );
    await expect(fetchUgTab(TAB_URL)).rejects.toThrow(/zablokował/i);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("forbidden", { status: 403 })),
    );
    await expect(fetchUgTab(TAB_URL)).rejects.toThrow(/zablokował/i);
  });

  it("fetchUgTab maps not-found and missing payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Oops! We can't find this page", { status: 200 })),
    );
    await expect(fetchUgTab(TAB_URL)).rejects.toThrow(/Nie znaleziono/i);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>empty</html>", { status: 200 })),
    );
    await expect(fetchUgTab(TAB_URL)).rejects.toThrow(/odczytać danych/i);
  });

  it("fetchUgTab maps timeout and network errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
      }),
    );
    await expect(fetchUgTab(TAB_URL)).rejects.toThrow(/limit czasu/i);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ENOTFOUND");
      }),
    );
    await expect(fetchUgTab(TAB_URL)).rejects.toThrow(/Błąd pobierania/i);
  });

  it("fetchUgTab rejects invalid JSON structure and non-chords tab", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(jsStoreHtml({ store: { page: { data: null } } }), {
          status: 200,
        }),
      ),
    );
    await expect(fetchUgTab(TAB_URL)).rejects.toThrow(/Nieprawidłowa struktura/i);

    const proTab = {
      store: {
        page: {
          data: {
            tab: { song_name: "Solo", type: "Guitar Pro", id: 1 },
            tab_view: { wiki_tab: { content: "[tab]x[/tab]" } },
          },
        },
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(jsStoreHtml(proTab), { status: 200 })),
    );
    await expect(fetchUgTab(TAB_URL)).rejects.toThrow(/tylko zakładki typu Chords/i);
  });

  it("searchUgChords returns [] for empty query", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(searchUgChords("  ")).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("searchUgChords ranks chord hits from js-store", async () => {
    const searchPayload = {
      store: {
        page: {
          data: {
            results: [
              {
                id: 1,
                song_name: "A",
                artist_name: "Foo",
                type: "Chords",
                votes: 10,
                tab_url: "https://tabs.ultimate-guitar.com/tab/foo/a-chords-1",
              },
            ],
          },
        },
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(jsStoreHtml(searchPayload), { status: 200 })),
    );
    const rows = await searchUgChords("survive", "foo");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.title).toBe("A");
    expect(rows[0]!.url).toContain("tabs.ultimate-guitar.com");
  });

  it("searchUgChords handles Cloudflare, timeout, and empty HTML", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("Just a moment... cf-browser-verification", { status: 200 }),
      ),
    );
    await expect(searchUgChords("x")).rejects.toThrow(/zablokował/i);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const err = new Error("timeout");
        err.name = "TimeoutError";
        throw err;
      }),
    );
    await expect(searchUgChords("x")).rejects.toThrow(/limit czasu wyszukiwania/i);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html></html>", { status: 200 })),
    );
    await expect(searchUgChords("x")).resolves.toEqual([]);
  });

  it("fetchUgTab resolves via search when direct tab is missing", async () => {
    const searchPayload = {
      store: {
        page: {
          data: {
            results: [
              {
                id: 180013,
                song_name: "I Will Survive",
                artist_name: "Gloria Gaynor",
                type: "Chords",
                votes: 99,
                tab_url: TAB_URL,
              },
            ],
          },
        },
      },
    };
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("search.php")) {
        return new Response(jsStoreHtml(searchPayload), { status: 200 });
      }
      if (url === TAB_URL) {
        return new Response(jsStoreHtml(fixture), { status: 200 });
      }
      return new Response("Oops!", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const missingUrl =
      "https://tabs.ultimate-guitar.com/tab/gloria-gaynor/i-will-survive-chords-999999";
    const result = await fetchUgTab(missingUrl);
    expect(result.metadata.title).toBe("I Will Survive");
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("search.php"))).toBe(
      true,
    );
  });
});
