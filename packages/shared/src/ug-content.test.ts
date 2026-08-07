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
    expect(decodeHtmlEntities("st&oacute;p tw&oacute;j")).toBe("stóp twój");
    expect(decodeHtmlEntities("&amp;oacute;")).toBe("ó");
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

  it("cleanUgTabContent decodes Latin entities and drops tip note lines", () => {
    const raw = `[Intro]
[Am] [Dm] [G] [C] |

[Verse 2]
U st&oacute;p ci złożę cały świat
I czeka na tw&oacute;j mały znak

[Outro]
[E] [Am]
*you can play E7 instead of E throughout the whole song
`;
    const cleaned = cleanUgTabContent(raw);
    expect(cleaned).toContain("U stóp ci złożę cały świat");
    expect(cleaned).toContain("I czeka na twój mały znak");
    expect(cleaned).not.toMatch(/&oacute;/i);
    expect(cleaned).not.toMatch(/you can play E7/i);
    expect(cleaned).toContain("[Outro]");
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

  it("importUgText paste path decodes entities and filters tip notes", () => {
    const result = importUgText(
      `[Verse]\n[Am]U st&oacute;p\n\n[Chorus]\n[C]Hello\n*you can play E7 instead of E throughout the whole song\n`,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lyricBlob = result.tekst.clips.map((c) => c.text).join("\n");
    expect(lyricBlob).toContain("stóp");
    expect(lyricBlob).not.toMatch(/&oacute;/i);
    expect(lyricBlob).not.toMatch(/you can play E7/i);
  });

  it("isUgAuthorNoteLine / isUgAsciiTabLine detectors", () => {
    expect(isUgAuthorNoteLine("")).toBe(false);
    expect(isUgAuthorNoteLine("tuning: EADGBE")).toBe(true);
    expect(
      isUgAuthorNoteLine(
        "*you can play E7 instead of E throughout the whole song",
      ),
    ).toBe(true);
    expect(isUgAuthorNoteLine("U stóp ci złożę")).toBe(false);
    expect(isUgAsciiTabLine("e|-0-2-3-|")).toBe(true);
    expect(isUgAsciiTabLine("[Am]Hello")).toBe(false);
    // Pathological length must not hang (ReDoS bound).
    expect(typeof isUgAuthorNoteLine(`(${"a".repeat(10_000)})`)).toBe("boolean");
    expect(isUgAuthorNoteLine(`(${"x".repeat(50)})`)).toBe(true);
  });
});
