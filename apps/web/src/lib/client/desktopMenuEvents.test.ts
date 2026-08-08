import { describe, expect, it } from "vitest";
import {
  DESKTOP_MENU_EVENT,
  isDesktopMenuAction,
  parseDesktopMenuDetail,
} from "./desktopMenuEvents.js";
import { currentTimelineProjectId } from "./desktopFileMenu.js";

describe("desktopMenuEvents", () => {
  it("isDesktopMenuAction accepts known actions", () => {
    expect(isDesktopMenuAction("save")).toBe(true);
    expect(isDesktopMenuAction("file-save")).toBe(true);
    expect(isDesktopMenuAction("file-new")).toBe(true);
    expect(isDesktopMenuAction("file-new-template")).toBe(true);
    expect(isDesktopMenuAction("file-new-from-template")).toBe(true);
    expect(isDesktopMenuAction("file-open")).toBe(true);
    expect(isDesktopMenuAction("file-save-as")).toBe(true);
    expect(isDesktopMenuAction("file-import")).toBe(true);
    expect(isDesktopMenuAction("file-import-song")).toBe(true);
    expect(isDesktopMenuAction("file-export")).toBe(true);
    expect(isDesktopMenuAction("appearance")).toBe(true);
    expect(isDesktopMenuAction("edit-cut")).toBe(true);
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
    expect(
      parseDesktopMenuDetail(
        new CustomEvent(DESKTOP_MENU_EVENT, {
          detail: { action: "file-new" },
        }),
      ),
    ).toEqual({ action: "file-new" });
  });
});

describe("desktopFileMenu", () => {
  it("currentTimelineProjectId reads /timeline/:id", () => {
    expect(currentTimelineProjectId("/admin")).toBeNull();
    expect(currentTimelineProjectId("/timeline")).toBeNull();
    expect(currentTimelineProjectId("/timeline/")).toBeNull();
    expect(currentTimelineProjectId("/timeline/proj-1")).toBe("proj-1");
  });
});
