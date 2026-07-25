/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsPopover } from "./SettingsPopover.js";

afterEach(() => {
  cleanup();
});

describe("SettingsPopover", () => {
  it("wires labelled dialog and Escape calls onClose", () => {
    const onClose = vi.fn();
    render(
      <SettingsPopover title="Ustawienia globalne" onClose={onClose}>
        <p>treść</p>
      </SettingsPopover>,
    );
    expect(screen.getByRole("dialog", { name: "Ustawienia globalne" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape", bubbles: true });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
