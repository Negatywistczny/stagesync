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

vi.mock("../lib/desktopBridge.js", () => ({
  prepareHostRestart: vi.fn(),
  syncNavRecentProjects: vi.fn(),
  syncNavTimelineProjectId: vi.fn(),
  toggleAppFullscreen: vi.fn(),
}));

vi.mock("../lib/nativeShell.js", () => ({
  shouldShowFullscreenControl: () => false,
  getStageSyncNative: () => null,
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

vi.mock("../lib/operatorNavShortcuts.js", () => ({
  useOperatorNavShortcuts: vi.fn(),
}));

vi.mock("../lib/useMqTablet.js", () => ({
  useMqTablet: vi.fn(() => false),
}));

vi.mock("../transport/useTransport.js", () => ({
  useTransport: () => ({
    state: {
      bpm: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      ppq: 960,
      activeProjectId: null,
    },
    displayTicks: 0,
    wsStatus: "connected",
    play: vi.fn(),
    commandPending: false,
    setlistSnapshot: { enabled: false },
  }),
}));

import { AdminShell } from "./AdminShell.js";
import { useMqMobileCompact } from "../lib/useMqMobileCompact.js";
import { shouldShowOperatorNav } from "../lib/operatorSurface.js";

function html(): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={["/admin"]}>
      <AdminShell />
    </MemoryRouter>,
  );
}

describe("AdminShell chrome", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMqMobileCompact).mockReturnValue(false);
    vi.mocked(shouldShowOperatorNav).mockReturnValue(false);
  });

  it("renders legacy section buttons on desktop", () => {
    const out = html();
    expect(out).toContain('aria-label="Sekcje"');
    expect(out).toContain("Utwory");
    expect(out).toContain("Set");
    expect(out).toContain("Scena");
    expect(out).toContain("Host");
    expect(out).toContain('aria-label="Aplikacje"');
    expect(out).toContain("Klient");
    expect(out).toContain("Ustawienia");
    expect(out).not.toContain('aria-label="Nawigacja operatora"');
  });

  it("renders legacy chrome on desktop when OperatorNav is allowed", () => {
    vi.mocked(shouldShowOperatorNav).mockReturnValue(true);
    const out = html();
    expect(out).toContain('aria-label="Sekcje"');
    expect(out).not.toContain('aria-label="Nawigacja operatora"');
  });

  it("renders OperatorNav on compact mobile when allowed", () => {
    vi.mocked(useMqMobileCompact).mockReturnValue(true);
    vi.mocked(shouldShowOperatorNav).mockReturnValue(true);
    const out = html();
    expect(out).toContain('aria-label="Nawigacja operatora"');
    expect(out).not.toContain('aria-label="Sekcje"');
  });

  it("falls back to legacy compact chrome when OperatorNav is hidden", () => {
    vi.mocked(useMqMobileCompact).mockReturnValue(true);
    vi.mocked(shouldShowOperatorNav).mockReturnValue(false);
    const out = html();
    expect(out).toContain('aria-label="Sekcja Admin"');
    expect(out).toContain('aria-label="Aplikacje"');
    expect(out).toContain("Klient");
    expect(out).not.toContain('aria-label="Nawigacja operatora"');
  });

  it("renders legacy chrome on tablet when OperatorNav is allowed", () => {
    vi.mocked(useMqMobileCompact).mockReturnValue(false);
    vi.mocked(shouldShowOperatorNav).mockReturnValue(true);
    const out = html();
    expect(out).toContain('aria-label="Sekcje"');
    expect(out).not.toContain('aria-label="Nawigacja operatora"');
  });

  it("keeps compact legacy chrome within viewport — no fixed segment min-width", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "AdminShell.module.css"),
      "utf8",
    );
    expect(css).toMatch(/\.chromeWrap\s*\{[^}]*overflow-x:\s*hidden/);
    const compactBlock =
      css.match(
        /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.sectionSelectInput\s*\{([^}]*)\}/,
      )?.[1] ?? "";
    expect(compactBlock).toContain("min-height: var(--ss-touch-min)");
    expect(compactBlock).toContain("max-height: var(--ss-touch-min)");
  });
});
