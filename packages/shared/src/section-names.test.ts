import { describe, expect, it } from "vitest";
import {
  formatSectionNameForDisplay,
  normalizeSectionName,
} from "./section-names.js";

describe("section-names", () => {
  it("normalizes English types and Polish aliases", () => {
    expect(normalizeSectionName("verse")).toBe("Verse");
    expect(normalizeSectionName("Zwrotka 2")).toBe("Verse 2");
    expect(normalizeSectionName("pre chorus")).toBe("Pre-Chorus");
    expect(normalizeSectionName("coda")).toBe("Outro");
    expect(normalizeSectionName("Piano Solo")).toBe("Piano Solo");
  });

  it("formats Polish display labels", () => {
    expect(formatSectionNameForDisplay("Intro", { polish: true })).toBe(
      "Wstęp",
    );
    expect(formatSectionNameForDisplay("Verse 2", { polish: true })).toBe(
      "Zwrotka 2",
    );
    expect(formatSectionNameForDisplay("Chorus", { polish: true })).toBe(
      "Refren",
    );
    expect(formatSectionNameForDisplay("Bridge", { polish: true })).toBe(
      "Most",
    );
    expect(formatSectionNameForDisplay("Countdown", { polish: true })).toBe(
      "Odliczanie",
    );
    expect(formatSectionNameForDisplay("Piano Solo", { polish: true })).toBe(
      "Solo (fortepian)",
    );
    expect(formatSectionNameForDisplay("Pre-Chorus", { polish: true })).toBe(
      "Przedrefren",
    );
    expect(formatSectionNameForDisplay("Intro", { polish: false })).toBe(
      "Intro",
    );
  });
});
