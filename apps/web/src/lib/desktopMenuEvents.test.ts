import { describe, expect, it } from "vitest";
import {
  DESKTOP_MENU_EVENT,
  isDesktopMenuAction,
  parseDesktopMenuDetail,
} from "./desktopMenuEvents.js";

describe("desktopMenuEvents", () => {
  it("isDesktopMenuAction accepts known actions", () => {
    expect(isDesktopMenuAction("save")).toBe(true);
    expect(isDesktopMenuAction("edit-undo")).toBe(true);
    expect(isDesktopMenuAction("unknown")).toBe(false);
  });

  it("parseDesktopMenuDetail requires CustomEvent with action string", () => {
    expect(parseDesktopMenuDetail(new Event("x"))).toBeNull();
    expect(
      parseDesktopMenuDetail(
        new CustomEvent(DESKTOP_MENU_EVENT, { detail: null }),
      ),
    ).toBeNull();
    expect(
      parseDesktopMenuDetail(
        new CustomEvent(DESKTOP_MENU_EVENT, { detail: { action: "" } }),
      ),
    ).toBeNull();
    expect(
      parseDesktopMenuDetail(
        new CustomEvent(DESKTOP_MENU_EVENT, {
          detail: { action: "transport-play" },
        }),
      ),
    ).toEqual({ action: "transport-play" });
  });
});
