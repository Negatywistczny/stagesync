/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { resolveChordNameParts } from "@stagesync/shared";
import { renderToStaticMarkup } from "react-dom/server";
import { ChordName, serializeChordNameHtml } from "./ChordName.js";

const CLASSES = {
  top: "top",
  root: "root",
  sup: "sup",
  bass: "bass",
  stack: "stack",
};

describe("ChordName (#478)", () => {
  it("serializes root baseline + superscript and stacked bass", () => {
    const parts = resolveChordNameParts("Cmaj7");
    const html = serializeChordNameHtml(parts, CLASSES, "inline");
    expect(html).toContain('class="root">C</span>');
    expect(html).toContain('<sup class="sup">Δ7</sup>');

    const slash = resolveChordNameParts("G/A");
    const stacked = serializeChordNameHtml(slash, CLASSES, "stack");
    expect(stacked).toContain('class="stack"');
    expect(stacked).toContain('class="bass">/A</span>');
    expect(stacked).not.toMatch(/bass">\/A<\/span><\/span><span class="bass"/);
  });

  it("renders React stack layout for tile chords", () => {
    const parts = resolveChordNameParts("Em7b5/Bb");
    const markup = renderToStaticMarkup(
      <ChordName parts={parts} classNames={CLASSES} bassLayout="stack" />,
    );
    expect(markup).toContain("stack");
    expect(markup).toContain(">E<");
    expect(markup).toContain("<sup");
    expect(markup).toContain("ø7");
    expect(markup).toContain("/B♭");
  });
});
