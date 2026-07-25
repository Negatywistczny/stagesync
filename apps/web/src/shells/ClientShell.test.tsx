/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createProjectSeed } from "@stagesync/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClientShell } from "./ClientShell.js";

vi.mock("../lib/desktopBridge.js", () => ({
  toggleAppFullscreen: vi.fn(),
}));

vi.mock("../lib/nativeShell.js", () => ({
  shouldShowFullscreenControl: () => false,
}));

vi.mock("../lib/screenWakeLock.js", () => ({
  requestScreenWakeLock: vi.fn(async () => null),
  releaseScreenWakeLock: vi.fn(async () => undefined),
}));

vi.mock("../lib/deviceNamePrefs.js", () => ({
  DEVICE_DISPLAY_NAME_CHANGED_EVENT: "stagesync:device-name",
  DEVICE_DISPLAY_NAME_MAX: 40,
  getStoredDeviceDisplayName: () => "Test Performer",
  setStoredDeviceDisplayName: (v: string) => v,
}));

const project = createProjectSeed("song-1", "Test Song", "2026-07-25T00:00:00.000Z");
project.defaultBpm = 112;
project.tempoMap = [{ id: "tempo-0", startTicks: 0, bpm: 112 }];
project.keyMap = [
  { id: "k0", startTicks: 0, key: { tonic: "G", mode: "major" } },
];

vi.mock("../lib/useActiveProject.js", () => ({
  useActiveProject: () => ({
    activeProject: project,
    setActiveProject: vi.fn(),
    loading: false,
    reload: vi.fn(),
  }),
}));

vi.mock("../transport/useTransport.js", () => ({
  useTransport: () => ({
    state: {
      playing: false,
      positionTicks: 0,
      bpm: 112,
      timeSignature: { numerator: 4, denominator: 4 },
      ppq: 960,
      activeProjectId: "song-1",
    },
    displayTicks: 0,
    wsStatus: "connected",
    latencyMs: 12,
    stageCues: [],
    liveDesk: {
      syncLeadMs: 0,
      transpositionSemitones: 0,
      clientEditEnabled: false,
      themeLock: null,
    },
    setlistSnapshot: { projectIds: ["song-1", "song-2"], enabled: true },
    play: vi.fn(),
    seek: vi.fn(),
    commandPending: false,
    error: null,
    announcePresence: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
});

function startGridRole() {
  fireEvent.click(screen.getByRole("button", { name: /Akordy/i }));
  fireEvent.click(screen.getByRole("button", { name: /^Rozpocznij$/i }));
}

describe("ClientShell chrome", () => {
  it("does not expose setlist next/prev controls (read-only Client)", () => {
    render(<ClientShell />);
    startGridRole();

    expect(
      screen.queryByRole("button", { name: /Następny utwór setlisty/i }),
    ).toBeNull();
    expect(screen.queryByText(/→następny/i)).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Poprzedni utwór setlisty/i }),
    ).toBeNull();
  });

  it("shows title, key, tempo, meter and bar in the header", () => {
    render(<ClientShell />);

    expect(screen.getByText("Test Song")).toBeTruthy();
    expect(screen.getByText("G")).toBeTruthy();
    expect(screen.getByText("112 BPM")).toBeTruthy();
    expect(screen.getByText("4/4")).toBeTruthy();

    startGridRole();

    const meta = screen.getByLabelText("Meta utworu");
    expect(meta.textContent).toMatch(/Tonacja/);
    expect(meta.textContent).toMatch(/Tempo/);
    expect(meta.textContent).toMatch(/Takt/);
  });
});
