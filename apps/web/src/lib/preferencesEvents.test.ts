import { describe, expect, it, vi } from "vitest";
import {
  OPEN_PREFERENCES_EVENT,
  isPreferencesTab,
  openPreferences,
  parseOpenPreferencesDetail,
} from "./preferencesEvents.js";

describe("preferencesEvents", () => {
  it("isPreferencesTab accepts known tabs only", () => {
    expect(isPreferencesTab("audio")).toBe(true);
    expect(isPreferencesTab("metronome")).toBe(true);
    expect(isPreferencesTab("video")).toBe(false);
    expect(isPreferencesTab(1)).toBe(false);
  });

  it("openPreferences dispatches CustomEvent with optional tab", () => {
    const dispatch = vi.fn();
    vi.stubGlobal("window", { dispatchEvent: dispatch });
    vi.stubGlobal(
      "CustomEvent",
      class CustomEvent<T> {
        type: string;
        detail: T;
        constructor(type: string, init?: { detail?: T }) {
          this.type = type;
          this.detail = init?.detail as T;
        }
      },
    );

    openPreferences();
    openPreferences("midi");
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch.mock.calls[0]![0]).toMatchObject({
      type: OPEN_PREFERENCES_EVENT,
      detail: {},
    });
    expect(dispatch.mock.calls[1]![0]).toMatchObject({
      detail: { tab: "midi" },
    });
    vi.unstubAllGlobals();
  });

  it("parseOpenPreferencesDetail reads CustomEvent detail", () => {
    expect(parseOpenPreferencesDetail(new Event("x"))).toBeNull();
    expect(
      parseOpenPreferencesDetail(
        new CustomEvent(OPEN_PREFERENCES_EVENT, { detail: { tab: "audio" } }),
      ),
    ).toEqual({ tab: "audio" });
    expect(
      parseOpenPreferencesDetail(
        new CustomEvent(OPEN_PREFERENCES_EVENT, { detail: { tab: "nope" } }),
      ),
    ).toEqual({});
    expect(
      parseOpenPreferencesDetail(
        new CustomEvent(OPEN_PREFERENCES_EVENT, { detail: null }),
      ),
    ).toEqual({});
  });
});
