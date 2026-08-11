/**
 * @vitest-environment jsdom
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import {
  OPEN_PREFERENCES_EVENT,
  openPreferences,
} from "@lib/client/preferencesEvents.js";
import { PreferencesEventBridge } from "./PreferencesEventBridge.js";

vi.mock("../settings/ServerSettingsModal.js", () => ({
  ServerSettingsModal: ({
    initialTab,
    onClose,
  }: {
    initialTab?: string;
    onClose: () => void;
  }) => (
    <div
      role="dialog"
      aria-label="Ustawienia"
      data-tab={initialTab ?? "general"}
    >
      <button type="button" onClick={onClose}>
        Zamknij
      </button>
    </div>
  ),
}));

afterEach(() => {
  cleanup();
});

function renderBridge(path = "/admin") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<PreferencesEventBridge />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PreferencesEventBridge", () => {
  it("opens ServerSettingsModal on openPreferences", () => {
    renderBridge();
    expect(screen.queryByRole("dialog", { name: "Ustawienia" })).toBeNull();
    act(() => {
      openPreferences("midi");
    });
    expect(
      screen
        .getByRole("dialog", { name: "Ustawienia" })
        .getAttribute("data-tab"),
    ).toBe("midi");
  });

  it("opens on stagesync:open-preferences CustomEvent", () => {
    renderBridge();
    act(() => {
      window.dispatchEvent(
        new CustomEvent(OPEN_PREFERENCES_EVENT, { detail: { tab: "audio" } }),
      );
    });
    expect(
      screen
        .getByRole("dialog", { name: "Ustawienia" })
        .getAttribute("data-tab"),
    ).toBe("audio");
  });

  it("opens on Cmd+,", () => {
    renderBridge();
    fireEvent.keyDown(window, { key: ",", metaKey: true });
    expect(screen.getByRole("dialog", { name: "Ustawienia" })).toBeTruthy();
  });

  it("ignores openPreferences on /client (Client shell owns settings)", () => {
    renderBridge("/client");
    act(() => {
      openPreferences("midi");
    });
    expect(screen.queryByRole("dialog", { name: "Ustawienia" })).toBeNull();
  });
});
