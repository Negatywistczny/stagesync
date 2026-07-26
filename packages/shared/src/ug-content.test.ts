import { describe, expect, it } from "vitest";
import {
  cleanUgTabContent,
  decodeHtmlEntities,
  isUgAsciiTabLine,
  isUgAuthorNoteLine,
  normalizeUgWikiMarkup,
} from "./ug-content.js";
import { importUgText } from "./ug-import.js";

describe("ug-content", () => {
  it("decodeHtmlEntities handles named and numeric entities", () => {
    expect(decodeHtmlEntities("&quot;hi&amp;&quot;")).toBe('"hi&"');
    expect(decodeHtmlEntities("&#65;&#x42;")).toBe("AB");
  });

  it("normalizeUgWikiMarkup converts [ch] tags", () => {
    expect(normalizeUgWikiMarkup("[tab][ch]Am[/ch]Hi[/tab]")).toBe("[Am]Hi");
  });

  it("filters ASCII tab staff and author notes but keeps blank lines", () => {
    const raw = `[Verse]
e|-0-2-3-|
B|-------|

[ch]Am[/ch]Hello

capo 2
[Chorus]
[ch]C[/ch]World`;
    const cleaned = cleanUgTabContent(raw);
    expect(cleaned).toContain("[Verse]");
    expect(cleaned).toContain("[Am]Hello");
    expect(cleaned).toContain("[Chorus]");
    expect(cleaned).not.toMatch(/e\|-/);
    expect(cleaned).not.toMatch(/capo/i);
    expect(cleaned).toMatch(/\n\n/);
  });

  it("importUgText accepts raw UG wiki markup", () => {
    const result = importUgText(
      "[tab][Verse]\n[ch]Am[/ch]At first I was afraid\n\n[Chorus]\n[ch]F[/ch]Oh no[/tab]",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sections.length).toBeGreaterThanOrEqual(2);
    expect(result.akordy.clips.some((c) => c.symbol === "Am")).toBe(true);
  });

  it("isUgAuthorNoteLine / isUgAsciiTabLine detectors", () => {
    expect(isUgAuthorNoteLine("")).toBe(false);
    expect(isUgAuthorNoteLine("tuning: EADGBE")).toBe(true);
    expect(isUgAsciiTabLine("e|-0-2-3-|")).toBe(true);
    expect(isUgAsciiTabLine("[Am]Hello")).toBe(false);
  });
});
