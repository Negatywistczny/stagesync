/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsPopover, SettingsPopoverAnchor } from "./SettingsPopover.js";

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
    expect(
      screen.getByRole("dialog", { name: "Ustawienia globalne" }),
    ).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape", bubbles: true });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes via Zamknij icon button", () => {
    const onClose = vi.fn();
    render(
      <SettingsPopover title="Ustawienia Client" onClose={onClose}>
        <p>treść</p>
      </SettingsPopover>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Zamknij" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("portals anchor placement to document.body", () => {
    render(
      <SettingsPopoverAnchor>
        <button type="button">trigger</button>
        <SettingsPopover title="Ustawienia globalne" onClose={() => {}}>
          <p>treść</p>
        </SettingsPopover>
      </SettingsPopoverAnchor>,
    );
    const dialog = screen.getByRole("dialog", { name: "Ustawienia globalne" });
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog.className).toMatch(/portaled/);
  });

  it("portals fixed-top-right placement to document.body", () => {
    render(
      <div data-testid="clipped">
        <SettingsPopover
          title="Ustawienia globalne"
          placement="fixed-top-right"
          onClose={() => {}}
        >
          <p>treść</p>
        </SettingsPopover>
      </div>,
    );
    const dialog = screen.getByRole("dialog", { name: "Ustawienia globalne" });
    expect(dialog.parentElement).toBe(document.body);
    expect(screen.getByTestId("clipped").contains(dialog)).toBe(false);
  });

  it("copies --ss-touch-min from the anchor tree onto the portaled panel", async () => {
    render(
      <div style={{ ["--ss-touch-min" as string]: "44px" }}>
        <SettingsPopoverAnchor>
          <button type="button">trigger</button>
          <SettingsPopover title="Ustawienia globalne" onClose={() => {}}>
            <p>treść</p>
          </SettingsPopover>
        </SettingsPopoverAnchor>
      </div>,
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Ustawienia globalne",
    });
    await vi.waitFor(() => {
      expect(dialog.style.getPropertyValue("--ss-touch-min")).toBe("44px");
    });
  });
});
