// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DesktopMenuBridge } from "./DesktopMenuBridge.js";
import { OPEN_PREFERENCES_EVENT } from "@lib/client/preferencesEvents.js";
import { DESKTOP_MENU_EVENT } from "@lib/client/desktopMenuEvents.js";

vi.mock("@lib/client/desktopBridge.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@lib/client/desktopBridge.js")>();
  return {
    ...actual,
    isDesktopShell: () => true,
    usesHtmlDesktopTitleBar: () => false,
    syncNavRecentProjects: vi.fn(),
    syncNavTimelineProjectId: vi.fn(),
    prepareHostRestart: vi.fn(),
  };
});

vi.mock("@lib/audio/audioOutputPrefs.js", () => ({
  restoreAudioOutputSink: vi.fn(),
  getStoredAudioOutputDeviceId: vi.fn().mockReturnValue("default"),
  applyAudioOutputSink: vi.fn().mockResolvedValue(true),
  setStoredAudioOutputDeviceId: vi.fn(),
  listAudioOutputDevices: vi.fn().mockResolvedValue([]),
}));

vi.mock("@lib/audio/audioPlayback.js", () => ({
  suppressAudioPlayback: vi.fn(),
}));

vi.mock("../../transport/useTransport.js", () => ({
  useTransport: () => ({
    play: vi.fn(),
    stop: vi.fn(),
    state: { activeProjectId: null },
    commandPending: false,
    latencyMs: 10,
  }),
}));

vi.mock("@lib/shell-operator/setlistApi.js", () => ({
  fetchSetlist: vi.fn().mockResolvedValue({
    enabled: true,
    entries: [{ id: "song-1" }, { id: "song-2" }],
    currentIndex: 0,
    next: { id: "song-2" },
  }),
  fetchMidiHostStatus: vi.fn().mockResolvedValue({
    config: { inputId: "", outputId: "", clockOutEnabled: false },
    ports: [],
  }),
  fetchServerSettings: vi.fn().mockResolvedValue({ values: {}, schema: [] }),
  postSystemRestart: vi.fn().mockResolvedValue({ ok: true }),
}));

describe("DesktopMenuBridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders within router and opens preferences modal on custom event", () => {
    render(
      <MemoryRouter initialEntries={["/timeline/song-1"]}>
        <DesktopMenuBridge />
      </MemoryRouter>,
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent(OPEN_PREFERENCES_EVENT, {
          detail: { tab: "general" },
        }),
      );
    });

    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("handles desktop menu action for QR code modal and host restart", () => {
    render(
      <MemoryRouter initialEntries={["/timeline/song-1"]}>
        <DesktopMenuBridge />
      </MemoryRouter>,
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent(DESKTOP_MENU_EVENT, {
          detail: { action: "host-qr" },
        }),
      );
    });

    expect(screen.getByRole("dialog")).toBeTruthy();

    act(() => {
      window.dispatchEvent(
        new CustomEvent(DESKTOP_MENU_EVENT, {
          detail: { action: "host-restart" },
        }),
      );
    });

    expect(screen.getAllByRole("dialog").length).toBeGreaterThan(0);
  });
});
