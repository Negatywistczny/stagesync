/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FormaClipPreview } from "./FormaClipPreview.js";
import styles from "../TimelineShell.module.css";

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
});
