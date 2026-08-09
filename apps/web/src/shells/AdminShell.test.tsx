/**
 * @vitest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@lib/client/useMqMobileCompact.js", () => ({
  useMqMobileCompact: vi.fn(() => false),
}));

vi.mock("@lib/client/useMqTablet.js", () => ({
  useMqTablet: vi.fn(() => false),
}));

vi.mock("@lib/shell-operator/operatorSurface.js", () => ({
  shouldShowOperatorNav: vi.fn(() => false),
  shouldShowFullscreenControl: vi.fn(() => false),
  isOsMenuDesktopShell: vi.fn(() => false),
}));

vi.mock("@lib/client/useAnnounceDevicePresence.js", () => ({
  useAnnounceDevicePresence: vi.fn(),
}));

vi.mock("@lib/client/desktopBridge.js", () => ({
  prepareHostRestart: vi.fn(),
  syncNavRecentProjects: vi.fn(),
  syncNavTimelineProjectId: vi.fn(),
  toggleAppFullscreen: vi.fn(),
  canReturnToLauncher: vi.fn(() => false),
}));

vi.mock("@lib/client/nativeShell.js", () => ({
  getStageSyncNative: () => null,
}));

vi.mock("@lib/shell-operator/libraryApi.js", () => ({
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

vi.mock("@lib/shell-operator/setlistApi.js", () => ({
  postSystemRestart: vi.fn(),
  postSystemShutdown: vi.fn(),
}));

vi.mock("@lib/shell-operator/operatorNavShortcuts.js", () => ({
  useOperatorNavShortcuts: vi.fn(),
}));

vi.mock("@lib/client/useMqTablet.js", () => ({
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
import { useMqMobileCompact } from "@lib/client/useMqMobileCompact.js";
import { useMqTablet } from "@lib/client/useMqTablet.js";
import {
  shouldShowFullscreenControl,
  shouldShowOperatorNav,
} from "@lib/shell-operator/operatorSurface.js";

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
    vi.mocked(useMqTablet).mockReturnValue(false);
    vi.mocked(shouldShowOperatorNav).mockReturnValue(false);
    vi.mocked(shouldShowFullscreenControl).mockReturnValue(false);
  });

  it("shows fullscreen control on web browser surface", () => {
    vi.mocked(shouldShowFullscreenControl).mockReturnValue(true);
    const out = html();
    expect(out).toContain('aria-label="Pełny ekran"');
  });

  it("hides fullscreen control on Tauri / native shells", () => {
    vi.mocked(shouldShowFullscreenControl).mockReturnValue(false);
    const out = html();
    expect(out).not.toContain('aria-label="Pełny ekran"');
  });

  it("shows fullscreen on compact mobile when OperatorNav is active", () => {
    vi.mocked(useMqMobileCompact).mockReturnValue(true);
    vi.mocked(shouldShowOperatorNav).mockReturnValue(true);
    vi.mocked(shouldShowFullscreenControl).mockReturnValue(true);
    const out = html();
    expect(out).toContain('aria-label="Nawigacja operatora"');
    expect(out).toContain('aria-label="Pełny ekran"');
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
    expect(out).toContain('aria-label="Aplikacje"');
    expect(out).not.toContain('aria-label="Nawigacja operatora"');
    expect(out).not.toContain("chromeCompact");
  });

  it("keeps tablet chrome on a single flex row (no wrap)", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "AdminShell.module.css"),
      "utf8",
    );
    const chromeBlock = css.match(/\.chrome\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(chromeBlock).toContain("flex-wrap: nowrap");
    expect(chromeBlock).not.toContain("flex-wrap: wrap");
    expect(css).toMatch(
      /@media\s*\(min-width:\s*641px\)\s*and\s*\(max-width:\s*1024px\)/,
    );
    const tabletBlock =
      css.match(
        /@media\s*\(min-width:\s*641px\)\s*and\s*\(max-width:\s*1024px\)\s*\{([\s\S]*?)\n\}/,
      )?.[1] ?? "";
    expect(tabletBlock).toContain(".chrome");
    expect(tabletBlock).not.toContain("grid-template-areas");
    expect(tabletBlock).not.toContain("flex-wrap: wrap");
    expect(tabletBlock).toContain(".sections");
    expect(tabletBlock).toMatch(/\.sections\s*\{[^}]*overflow-x:\s*auto/);
    expect(tabletBlock).toMatch(/\.appJump\s*\{[^}]*flex-shrink:\s*0/);
    expect(tabletBlock).toMatch(
      /\.appJump\s*\{[^}]*padding-inline-start:\s*var\(--ss-space-3\)/,
    );
  });

  it("uses shared phone compact chrome at ≤640px (no Tauri-only legacy header path)", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "AdminShell.module.css"),
      "utf8",
    );
    const mobileBlock =
      css.match(/@media\s*\(max-width:\s*640px\)\s*\{([\s\S]*?)\n\}/)?.[1] ??
      "";
    expect(mobileBlock).not.toContain(
      ".chrome.chromeLegacy:not(.chromeCompact)",
    );
    expect(mobileBlock).toContain(".chromeCompact");
    expect(mobileBlock).toMatch(
      /\.split\s*\{[^}]*grid-template-columns:\s*1fr/,
    );
  });

  it("keeps compact chrome within viewport — touch targets and no vertical clamp", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "AdminShell.module.css"),
      "utf8",
    );
    expect(css).toMatch(/\.chromeWrap\s*\{[^}]*overflow-x:\s*hidden/);
    const mobileBlock =
      css.match(/@media\s*\(max-width:\s*640px\)\s*\{([\s\S]*?)\n\}/)?.[1] ??
      "";
    expect(mobileBlock).toContain("--ss-touch-min: var(--ss-touch-min-client)");
    const compactBlock =
      css.match(/\.chromeCompact\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(compactBlock).toContain("--ss-touch-min: var(--ss-touch-min-shell-action)");
    expect(compactBlock).toContain("overflow-y: hidden");
    expect(compactBlock).toContain("var(--ss-touch-min-shell-action) + var(--ss-space-1)");
    expect(compactBlock).not.toContain("max-height:");
    const selectBlock =
      css.match(
        /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.sectionSelectInput\s*\{([^}]*)\}/,
      )?.[1] ?? "";
    expect(selectBlock).toContain("min-height: var(--ss-touch-min)");
    expect(selectBlock).toContain("max-height: var(--ss-touch-min)");
    const appJumpBlock =
      css.match(
        /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.appJumpCompact a,\s*\n\s*\.appJumpCompact \.appJumpMuted\s*\{([^}]*)\}/,
      )?.[1] ?? "";
    expect(appJumpBlock).toContain("min-height: var(--ss-touch-min-shell-action)");
  });

  it("section views use compact breakpoint for accordion (641px+ desktop layout)", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const adminDir = join(dirname(fileURLToPath(import.meta.url)), "admin");
    for (const file of ["SetView.tsx", "StageView.tsx", "SystemView.tsx"]) {
      const src = readFileSync(join(adminDir, file), "utf8");
      expect(src).toContain("useMqMobileCompact");
      expect(src).not.toContain("useMqMobile.js");
    }
    const shellSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "AdminShell.tsx"),
      "utf8",
    );
    expect(shellSrc).toContain("useMqMobileCompact");
    expect(shellSrc).not.toContain("useMqMobile.js");
  });
});
