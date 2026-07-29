/**
 * @vitest-environment jsdom
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OPEN_PREFERENCES_EVENT,
  openPreferences,
} from "../lib/preferencesEvents.js";
import { PreferencesEventBridge } from "./PreferencesEventBridge.js";

vi.mock("./ServerSettingsModal.js", () => ({
  ServerSettingsModal: ({
    initialTab,
    onClose,
  }: {
    initialTab?: string;
    onClose: () => void;
  }) => (
    <div role="dialog" aria-label="Ustawienia" data-tab={initialTab ?? "general"}>
      <button type="button" onClick={onClose}>
        Zamknij
      </button>
    </div>
  ),
}));

afterEach(() => {
  cleanup();
});

describe("PreferencesEventBridge", () => {
  it("opens ServerSettingsModal on openPreferences", () => {
    render(<PreferencesEventBridge />);
    expect(screen.queryByRole("dialog", { name: "Ustawienia" })).toBeNull();
    act(() => {
      openPreferences("midi");
    });
    expect(
      screen.getByRole("dialog", { name: "Ustawienia" }).getAttribute("data-tab"),
    ).toBe("midi");
  });

  it("opens on stagesync:open-preferences CustomEvent", () => {
    render(<PreferencesEventBridge />);
    act(() => {
      window.dispatchEvent(
        new CustomEvent(OPEN_PREFERENCES_EVENT, { detail: { tab: "audio" } }),
      );
    });
    expect(
      screen.getByRole("dialog", { name: "Ustawienia" }).getAttribute("data-tab"),
    ).toBe("audio");
  });

  it("opens on Cmd+,", () => {
    render(<PreferencesEventBridge />);
    fireEvent.keyDown(window, { key: ",", metaKey: true });
    expect(screen.getByRole("dialog", { name: "Ustawienia" })).toBeTruthy();
  });
});
