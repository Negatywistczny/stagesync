import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildFetchResult,
  extractDataContentJson,
  extractTabId,
  getPageData,
  hasUgTabPayload,
  isCloudflareChallenge,
  isUgNotFound,
  isValidUgTabUrl,
  normalizeUgMetadata,
  parseUgUrlSlug,
} from "./ug-fetch.js";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures/ug-tab-sample.json",
);
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;

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
    const encoded = JSON.stringify(payload)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;");
    const html = `<div class="js-store" data-content="${encoded}"></div>`;
    const raw = extractDataContentJson(html);
    expect(getPageData(raw)?.tab?.song_name).toBe("X");
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
});
