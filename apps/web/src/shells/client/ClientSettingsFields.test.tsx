// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GlobalSettingsFields } from "./ClientSettingsFields.js";
import type { ClientDisplayPrefs } from "@lib/client/clientDisplayPrefs.js";

function createDefaultPrefs(): ClientDisplayPrefs {
  return {
    instrumentPitch: "concert",
    instrumentPitchManual: 0,
    hybridPolishB: true,
    sectionNamesPolish: true,
    gridAnimations: true,
    formNotesEdit: false,
    literalQuality: false,
  };
}

describe("ClientSettingsFields", () => {
  it("renders transposition options and handles pitch selection", () => {
    const prefs = createDefaultPrefs();
    const onPrefsChange = vi.fn();

    render(
      <GlobalSettingsFields prefs={prefs} onPrefsChange={onPrefsChange} />,
    );

    expect(screen.getByText("Wygląd")).toBeTruthy();
    expect(screen.getByText("Strój instrumentu")).toBeTruthy();

    const bbBtn = screen.getByTitle("Instrument B♭ — korekta +2 półtony");
    fireEvent.click(bbBtn);

    expect(onPrefsChange).toHaveBeenCalledWith(
      expect.objectContaining({ instrumentPitch: "bb" }),
    );
  });
});
