import { describe, expect, it } from "vitest";
import {
  joinTekstBlockTexts,
  withTekstBlockWordSpaces,
} from "./tekst-block-text.js";

describe("joinTekstBlockTexts", () => {
  it("concatenates including trailing word-boundary spaces", () => {
    expect(
      joinTekstBlockTexts([
        { text: "I " },
        { text: "hear " },
        { text: "the " },
        { text: "drums" },
      ]),
    ).toBe("I hear the drums");
  });

  it("keeps mid-word syllables glued when no spaces stored", () => {
    expect(joinTekstBlockTexts([{ text: "A" }, { text: "bout" }])).toBe(
      "About",
    );
  });
});

describe("withTekstBlockWordSpaces", () => {
  it("restores trailing spaces from line text when blocks were trimmed", () => {
    const blocks = withTekstBlockWordSpaces("I hear the drums", [
      { id: "1", text: "I" },
      { id: "2", text: "hear" },
      { id: "3", text: "the" },
      { id: "4", text: "drums" },
    ]);
    expect(blocks.map((b) => b.text)).toEqual(["I ", "hear ", "the ", "drums"]);
    expect(joinTekstBlockTexts(blocks)).toBe("I hear the drums");
  });

  it("keeps mid-word syllables glued (About → A + bout)", () => {
    const blocks = withTekstBlockWordSpaces("About time", [
      { id: "1", text: "A" },
      { id: "2", text: "bout" },
      { id: "3", text: "time" },
    ]);
    expect(blocks.map((b) => b.text)).toEqual(["A", "bout ", "time"]);
  });

  it("leaves blocks unchanged when they already carry edge spaces", () => {
    const input = [
      { id: "1", text: "Hello " },
      { id: "2", text: "world" },
    ];
    const out = withTekstBlockWordSpaces("Hello world", input);
    expect(out.map((b) => b.text)).toEqual(["Hello ", "world"]);
  });

  it("is a no-op when join already equals line text", () => {
    const input = [{ id: "1", text: "Solo" }];
    expect(withTekstBlockWordSpaces("Solo", input).map((b) => b.text)).toEqual([
      "Solo",
    ]);
  });
});
