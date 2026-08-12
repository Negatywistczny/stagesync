// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StaticDomAnchor } from "./StaticDomAnchor.js";

describe("StaticDomAnchor", () => {
  it("renders inner HTML and prevents updates via shouldComponentUpdate", () => {
    const domRef = { current: null };

    const { rerender } = render(
      <StaticDomAnchor
        domRef={domRef}
        className="chord-anchor"
        initialHtml="<span>Cmaj7</span>"
        datasetChord="Cmaj7"
      />,
    );

    expect(screen.getByText("Cmaj7")).toBeTruthy();
    expect(domRef.current).not.toBeNull();

    // Rerender with different HTML should not change rendered HTML because shouldComponentUpdate returns false
    rerender(
      <StaticDomAnchor
        domRef={domRef}
        className="chord-anchor"
        initialHtml="<span>Dmin7</span>"
        datasetChord="Dmin7"
      />,
    );

    expect(screen.getByText("Cmaj7")).toBeTruthy();
  });
});
