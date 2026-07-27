/**
 * @vitest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/useMqMobileCompact.js", () => ({
  useMqMobileCompact: vi.fn(() => false),
}));

vi.mock("../lib/operatorSurface.js", () => ({
  shouldShowOperatorNav: vi.fn(() => false),
}));

vi.mock("../lib/useAnnounceDevicePresence.js", () => ({
  useAnnounceDevicePresence: vi.fn(),
}));

vi.mock("../transport/useTransport.js", () => ({
  useTransport: () => ({
    state: {
      playing: false,
      bpm: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      ppq: 960,
      activeProjectId: null,
    },
    displayTicks: 0,
    wsStatus: "connected",
    play: vi.fn(),
    commandPending: false,
    setlistSnapshot: { enabled: false, next: null, currentIndex: -1 },
  }),
}));

vi.mock("../lib/libraryApi.js", () => ({
  fetchLibrary: vi.fn(async () => ({ projects: [] })),
  fetchProject: vi.fn(),
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  updateProject: vi.fn(),
  putProject: vi.fn(),
  exportLibraryPack: vi.fn(),
  importLibraryPack: vi.fn(),
  batchMidiProgramIds: vi.fn(),
}));

vi.mock("../lib/setlistApi.js", () => ({
  postSystemRestart: vi.fn(),
  postSystemShutdown: vi.fn(),
}));

vi.mock("../lib/desktopBridge.js", () => ({
  prepareHostRestart: vi.fn(),
  syncNavRecentProjects: vi.fn(),
  syncNavTimelineProjectId: vi.fn(),
  toggleAppFullscreen: vi.fn(),
}));

vi.mock("../lib/nativeShell.js", () => ({
  shouldShowFullscreenControl: () => false,
}));

import { useMqMobileCompact } from "../lib/useMqMobileCompact.js";
import { shouldShowOperatorNav } from "../lib/operatorSurface.js";
import { AdminShell } from "./AdminShell.js";

function html(): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={["/admin"]}>
      <AdminShell />
    </MemoryRouter>,
  );
}

describe("AdminShell chrome", () => {
  afterEach(() => {
    vi.mocked(useMqMobileCompact).mockReturnValue(false);
    vi.mocked(shouldShowOperatorNav).mockReturnValue(false);
  });

  it("renders legacy section tabs on desktop", () => {
    const out = html();
    expect(out).toContain('aria-label="Sekcje"');
    expect(out).toContain("Utwory");
    expect(out).toContain("Set");
    expect(out).toContain("Scena");
    expect(out).toContain("Host");
    expect(out).toContain('aria-label="Aplikacje"');
    expect(out).toContain("Timeline");
    expect(out).toContain("Klient");
    expect(out).not.toContain('aria-label="Nawigacja operatora"');
  });

  it("renders OperatorNav on compact mobile when enabled", () => {
    vi.mocked(useMqMobileCompact).mockReturnValue(true);
    vi.mocked(shouldShowOperatorNav).mockReturnValue(true);
    const out = html();
    expect(out).toContain('aria-label="Nawigacja operatora"');
    expect(out).not.toContain('aria-label="Sekcje"');
  });
});
