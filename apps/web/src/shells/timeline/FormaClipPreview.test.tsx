/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FormaClipPreview } from "./FormaClipPreview.js";
import styles from "./TimelineShell.module.css";

afterEach(() => {
  cleanup();
});

describe("FormaClipPreview", () => {
  it("wraps label in formaClipLabel (parity with committed FormaClipButton)", () => {
    render(
      <FormaClipPreview
        label="Sekcja"
        style={{ left: "10px", width: "48px" }}
      />,
    );
    const root = screen.getByTestId("forma-clip-preview");
    const label = screen.getByText("Sekcja");
    expect(label.tagName).toBe("SPAN");
    expect(label.className).toContain(styles.formaClipLabel);
    expect(root.contains(label)).toBe(true);
    expect(root.className).toContain(styles.formaPreview);
  });

  it("stays decorative (aria-hidden) for empty and non-empty labels", () => {
    const { rerender } = render(
      <FormaClipPreview label="" style={{ left: "0", width: "24px" }} />,
    );
    expect(
      screen.getByTestId("forma-clip-preview").getAttribute("aria-hidden"),
    ).toBe("true");
    rerender(
      <FormaClipPreview label="Intro" style={{ left: "4px", width: "80px" }} />,
    );
    expect(
      screen.getByTestId("forma-clip-preview").getAttribute("aria-hidden"),
    ).toBe("true");
  });
});
