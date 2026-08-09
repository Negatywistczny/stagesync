import { describe, expect, it, vi } from "vitest";
import { resolveOperatorNavShortcut } from "./operatorNavShortcuts.js";

vi.mock("./operatorNavRoutes.js", () => ({
  getAdminNavUrl: (section?: string) =>
    section ? `/admin?section=${section}` : "/admin",
  getTimelineNavUrl: () => "/timeline/last-id",
  getClientNavUrl: () => "/client",
}));

describe("resolveOperatorNavShortcut", () => {
  it("maps Ctrl/Cmd+1..3 to app routes", () => {
    expect(
      resolveOperatorNavShortcut({
        key: "1",
        code: "Digit1",
        mod: true,
        alt: false,
        shift: false,
        ctrl: true,
        meta: false,
      }),
    ).toEqual({ type: "navigate", path: "/admin" });

    expect(
      resolveOperatorNavShortcut({
        key: "2",
        code: "Digit2",
        mod: true,
        alt: false,
        shift: false,
        ctrl: true,
        meta: false,
      }),
    ).toEqual({ type: "navigate", path: "/timeline/last-id" });

    expect(
      resolveOperatorNavShortcut({
        key: "3",
        code: "Digit3",
        mod: true,
        alt: false,
        shift: false,
        ctrl: true,
        meta: false,
      }),
    ).toEqual({
      type: "navigate",
      path: "/client",
      markSession: true,
    });
  });

  it("maps Alt+1..4 to admin sections", () => {
    expect(
      resolveOperatorNavShortcut({
        key: "4",
        code: "Digit4",
        mod: false,
        alt: true,
        shift: false,
        ctrl: false,
        meta: false,
      }),
    ).toEqual({ type: "navigate", path: "/admin?section=host" });
  });

  it("ignores shift chords", () => {
    expect(
      resolveOperatorNavShortcut({
        key: "1",
        code: "Digit1",
        mod: true,
        alt: false,
        shift: true,
        ctrl: true,
        meta: false,
      }),
    ).toBeNull();
  });
});
