// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  TimelinePortals,
  type TimelinePortalsProps,
} from "./TimelinePortals.js";

function createDefaultProps(
  overrides?: Partial<TimelinePortalsProps>,
): TimelinePortalsProps {
  return {
    eyeOpen: false,
    eyeMenuPos: null,
    eyeMenuRef: { current: null },
    eyeMenuId: "eye-menu",
    trackVisibility: {},
    toggleTrack: vi.fn(),
    toolsVisOpen: false,
    toolsVisMenuPos: null,
    toolsVisMenuRef: { current: null },
    toolsVisMenuId: "tools-vis-menu",
    toolbarVisibleSet: new Set(["pointer", "hand", "zoom"]),
    setToolbarVisibleTools: vi.fn(),
    toolMenu: null,
    toolMenuRef: { current: null },
    tool: "pointer",
    onTool: vi.fn(),
    wandMenu: null,
    wandMenuRef: { current: null },
    applyWand: vi.fn(),
    ...overrides,
  };
}

describe("TimelinePortals", () => {
  it("renders eye track visibility menu and handles toggles", () => {
    const toggleTrack = vi.fn();
    const props = createDefaultProps({
      eyeOpen: true,
      eyeMenuPos: { top: 100, left: 100 },
      toggleTrack,
    });

    render(<TimelinePortals {...props} />);

    expect(screen.getByRole("menu")).toBeTruthy();
    const akordyBtn = screen.getByRole("menuitemcheckbox", { name: /Akordy/i });
    fireEvent.click(akordyBtn);
    expect(toggleTrack).toHaveBeenCalledWith("akordy");
  });

  it("renders tools visibility menu and handles tool toggles", () => {
    const setToolbarVisibleTools = vi.fn();
    const props = createDefaultProps({
      toolsVisOpen: true,
      toolsVisMenuPos: { top: 120, left: 150 },
      setToolbarVisibleTools,
    });

    render(<TimelinePortals {...props} />);

    const toolsMenu = screen.getByRole("menu", {
      name: "Widoczne narzędzia na pasku",
    });
    expect(toolsMenu).toBeTruthy();

    const zoomBtn = screen.getByRole("menuitemcheckbox", { name: /Zoom/i });
    fireEvent.click(zoomBtn);
    expect(setToolbarVisibleTools).toHaveBeenCalled();
  });

  it("renders wand menu and handles wand mode click", () => {
    const applyWand = vi.fn();
    const props = createDefaultProps({
      wandMenu: { top: 150, left: 200 },
      applyWand,
    });

    render(<TimelinePortals {...props} />);

    expect(
      screen.getByRole("menu", { name: "Różdżka — wybór źródła" }),
    ).toBeTruthy();
    const tekstBtn = screen.getByText("Tekst → Forma");
    fireEvent.click(tekstBtn);
    expect(applyWand).toHaveBeenCalledWith("tekst");
  });
});
