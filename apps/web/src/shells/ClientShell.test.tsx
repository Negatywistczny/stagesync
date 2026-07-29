/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { createProjectSeed } from "@stagesync/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DESKTOP_MENU_EVENT } from "../lib/desktopMenuEvents.js";
import { shouldShowOperatorNav } from "../lib/operatorSurface.js";
import { useMqMobileCompact } from "../lib/useMqMobileCompact.js";
import { ClientShell } from "./ClientShell.js";

vi.mock("../lib/desktopBridge.js", () => ({
  toggleAppFullscreen: vi.fn(),
}));

vi.mock("../lib/nativeShell.js", () => ({
  shouldShowFullscreenControl: () => false,
  canChangeServer: () => false,
  getStageSyncNative: () => null,
}));

vi.mock("../lib/operatorSurface.js", () => ({
  shouldShowOperatorNav: vi.fn(() => false),
}));

vi.mock("../lib/useMqMobileCompact.js", () => ({
  useMqMobileCompact: vi.fn(() => false),
}));

vi.mock("../lib/operatorNavShortcuts.js", () => ({
  useOperatorNavShortcuts: vi.fn(),
}));

vi.mock("../lib/lastTimelineProject.js", () => ({
  getLastTimelineProjectId: vi.fn(() => "proj-1"),
}));

vi.mock("../lib/screenWakeLock.js", () => ({
  requestScreenWakeLock: vi.fn(async () => null),
  releaseScreenWakeLock: vi.fn(async () => undefined),
}));

vi.mock("./client/ScorePane.js", () => ({
  ScorePane: () => <div data-testid="score-pane">score</div>,
}));

vi.mock("./client/KaraokePane.js", () => ({
  KaraokePane: () => <div data-testid="karaoke-pane">karaoke</div>,
}));

vi.mock("./client/GridPane.js", () => ({
  GridPane: () => <div data-testid="grid-pane">grid</div>,
}));

vi.mock("./client/DrumsPane.js", () => ({
  DrumsPane: () => <div data-testid="drums-pane">drums</div>,
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
  vi.unstubAllGlobals();
  vi.mocked(shouldShowOperatorNav).mockReturnValue(false);
  vi.mocked(useMqMobileCompact).mockReturnValue(false);
});

function startGridRole() {
  fireEvent.click(screen.getByRole("button", { name: /Akordy/i }));
  const start = screen.queryByRole("button", { name: /^Rozpocznij$/i });
  if (start) fireEvent.click(start);
}

function startScoreRole() {
  fireEvent.click(screen.getByRole("button", { name: /Partytura/i }));
  const start = screen.queryByRole("button", { name: /^Rozpocznij$/i });
  if (start) fireEvent.click(start);
}

function startKaraokeRole() {
  fireEvent.click(screen.getByRole("button", { name: /^Tekst$/i }));
  const start = screen.queryByRole("button", { name: /^Rozpocznij$/i });
  if (start) fireEvent.click(start);
}

function startDrumsRole() {
  fireEvent.click(screen.getByRole("button", { name: /^Forma$/i }));
  const start = screen.queryByRole("button", { name: /^Rozpocznij$/i });
  if (start) fireEvent.click(start);
}

function renderClient() {
  return render(
    <MemoryRouter initialEntries={["/client"]}>
      <ClientShell />
    </MemoryRouter>,
  );
}

describe("ClientShell chrome", () => {
  it("does not force Client 44px touch targets on the desktop page root", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "ClientShell.module.css"),
      "utf8",
    );
    const desktopPageBlock = css.match(/^\.page\s*\{([^}]*)\}/m)?.[1] ?? "";
    // Unconditional page override would make Desktop Client buttons 44px vs Admin 36px.
    expect(desktopPageBlock).not.toContain("--ss-touch-min-client");
    expect(css).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.page\s*\{[^}]*--ss-touch-min:\s*var\(--ss-touch-min-client\)/,
    );
  });

  it("matches AppHeader compact padding on mobile Client chrome", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "ClientShell.module.css"),
      "utf8",
    );
    const compactBlock =
      css.match(
        /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.headerCompact\s*\{([^}]*)\}/,
      )?.[1] ?? "";
    expect(compactBlock).toContain("padding: var(--ss-space-1) var(--ss-space-2)");
    expect(compactBlock).toContain(
      "padding-top: max(var(--ss-space-1), env(safe-area-inset-top, 0px))",
    );
    expect(compactBlock).not.toMatch(/\n\s*height:\s*calc\(/);
    expect(compactBlock).not.toMatch(/\bmax-height:/);
  });

  it("uses ShellIconButton (ss-btn--icon) for global settings chrome", () => {
    renderClient();
    const settings = screen.getByRole("button", { name: /Ustawienia globalne/i });
    expect(settings.className).toContain("ss-btn");
    expect(settings.className).toContain("ss-btn--icon");
  });

  it("hides operator chrome without operator session", () => {
    vi.mocked(shouldShowOperatorNav).mockReturnValue(false);
    renderClient();
    expect(screen.queryByLabelText("Nawigacja operatora")).toBeNull();
    expect(screen.queryByLabelText("Aplikacje")).toBeNull();
    expect(
      screen.getByRole("button", { name: /Ustawienia globalne/i }),
    ).toBeTruthy();
  });

  it("shows Admin/Timeline app jump on tablet/desktop with operator session", () => {
    vi.mocked(shouldShowOperatorNav).mockReturnValue(true);
    vi.mocked(useMqMobileCompact).mockReturnValue(false);
    renderClient();
    expect(screen.queryByLabelText("Nawigacja operatora")).toBeNull();
    const apps = screen.getByLabelText("Aplikacje");
    expect(apps.textContent).toContain("Admin");
    expect(apps.textContent).toContain("Timeline");
    expect(
      screen.getByRole("button", { name: /Ustawienia globalne/i }),
    ).toBeTruthy();
  });

  it("shows OperatorNav on compact mobile with operator session", () => {
    vi.mocked(shouldShowOperatorNav).mockReturnValue(true);
    vi.mocked(useMqMobileCompact).mockReturnValue(true);
    renderClient();
    expect(screen.getByLabelText("Nawigacja operatora")).toBeTruthy();
    expect(screen.getByLabelText("Aplikacje").textContent).toMatch(/Admin/);
    expect(screen.getByLabelText("Aplikacje").textContent).toMatch(/Klient/);
    // Settings live on OperatorNav — not a second gear in Client chrome.
    expect(
      screen.getAllByRole("button", { name: /Ustawienia globalne/i }),
    ).toHaveLength(1);
  });

  it("does not expose setlist next/prev controls (read-only Client)", () => {
    renderClient();
    startGridRole();

    expect(
      screen.queryByRole("button", { name: /Następny utwór setlisty/i }),
    ).toBeNull();
    expect(screen.queryByText(/→następny/i)).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Poprzedni utwór setlisty/i }),
    ).toBeNull();
  });

  it("shows song title in the header without key/tempo/meter/bar meta", () => {
    renderClient();

    expect(screen.getByText("Test Song")).toBeTruthy();
    expect(screen.queryByLabelText("Meta utworu")).toBeNull();
    expect(screen.queryByText("Tonacja")).toBeNull();
    expect(screen.queryByText("112 BPM")).toBeNull();
    expect(screen.queryByText("4/4")).toBeNull();

    startGridRole();

    expect(screen.getByText("Test Song")).toBeTruthy();
    expect(screen.queryByLabelText("Meta utworu")).toBeNull();
  });


  it("toggles role tile aria-pressed on the welcome picker", () => {
    renderClient();
    const chords = screen.getByRole("button", { name: /Akordy/i });
    expect(chords.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(chords);
    expect(chords.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(chords);
    expect(chords.getAttribute("aria-pressed")).toBe("false");
  });

  it("enters a role immediately on phone welcome tiles (no Rozpocznij)", () => {
    vi.mocked(useMqMobileCompact).mockReturnValue(true);
    vi.stubGlobal(
      "matchMedia",
      (query: string) =>
        ({
          matches: query.includes("max-width: 640px"),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as MediaQueryList,
    );
    renderClient();
    expect(screen.queryByRole("button", { name: /^Rozpocznij$/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Akordy/i }));
    expect(screen.getByTestId("grid-pane")).toBeTruthy();
  });

  it("uses compact connection status on narrow phones (≤640px)", () => {
    vi.mocked(useMqMobileCompact).mockReturnValue(true);
    vi.stubGlobal(
      "matchMedia",
      (query: string) =>
        ({
          matches: query.includes("max-width: 640px"),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as MediaQueryList,
    );
    renderClient();
    expect(screen.getByText("12 ms")).toBeTruthy();
    expect(screen.queryByText("Połączony")).toBeNull();
  });

  it("shows Rozpocznij on tablet welcome (641–768px)", () => {
    vi.mocked(useMqMobileCompact).mockReturnValue(false);
    vi.stubGlobal(
      "matchMedia",
      () =>
        ({
          matches: false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as MediaQueryList,
    );
    renderClient();
    expect(screen.getByRole("button", { name: /^Rozpocznij$/i })).toBeTruthy();
  });

  it("opens global settings from desktop menu Wygląd (appearance)", () => {
    renderClient();
    fireEvent(
      window,
      new CustomEvent(DESKTOP_MENU_EVENT, { detail: { action: "appearance" } }),
    );
    expect(
      screen.getByRole("dialog", { name: /Ustawienia globalne/i }),
    ).toBeTruthy();
    expect(screen.getByText("Wygląd")).toBeTruthy();
  });

  it("edits device name on role picker, not in global settings", () => {
    renderClient();

    expect(screen.getByRole("button", { name: /Zmień nazwę/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Ustawienia globalne/i }));
    const dialog = screen.getByRole("dialog", { name: /Ustawienia globalne/i });
    expect(dialog).toBeTruthy();
    expect(dialog.parentElement).toBe(document.body);
    expect(screen.queryByLabelText("Nazwa urządzenia")).toBeNull();
    expect(screen.queryByRole("button", { name: /Zapisz nazwę/i })).toBeNull();
  });

  it("opens labelled rename dialog from Zmień nazwę", () => {
    renderClient();
    fireEvent.click(screen.getByRole("button", { name: /Zmień nazwę/i }));
    expect(screen.getByRole("dialog", { name: /Zmień nazwę/i })).toBeTruthy();
    expect(
      screen.getByRole("textbox", { name: "Imię lub nazwa urządzenia" }),
    ).toBeTruthy();
  });

  it("names instrument pitch group in global settings", () => {
    renderClient();
    fireEvent.click(screen.getByRole("button", { name: /Ustawienia globalne/i }));
    expect(
      screen.getByRole("group", { name: "Strój instrumentu transponującego" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Strój koncertowy (C)" }),
    ).toBeTruthy();
  });

  it("names Partytura zoom controls in role settings", () => {
    renderClient();
    startScoreRole();
    expect(screen.getByTestId("score-pane")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Ustawienia Partytura/i }));
    expect(screen.getByRole("button", { name: "Pomniejsz partyturę" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Powiększ partyturę" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Resetuj zoom partytury" })).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "Transpozycja oktawy partytury" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("switch", { name: /Śledź wskaźnik odtwarzania/i }),
    ).toBeTruthy();
  });

  it("exposes Tekst role settings Auto-scroll and Tap wokalu switches", () => {
    renderClient();
    startKaraokeRole();
    expect(screen.getByTestId("karaoke-pane")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Ustawienia Tekst/i }));
    expect(screen.getByRole("switch", { name: /Auto-scroll/i })).toBeTruthy();
    expect(screen.getByRole("switch", { name: /Tap wokalu/i })).toBeTruthy();
  });

  it("exposes Akordy role settings display switches", () => {
    renderClient();
    startGridRole();
    expect(screen.getByTestId("grid-pane")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Ustawienia Akordy/i }));
    expect(screen.getByRole("switch", { name: /H zamiast B/i })).toBeTruthy();
    expect(screen.getByRole("switch", { name: /Litery zamiast symboli/i })).toBeTruthy();
    expect(screen.getByRole("switch", { name: /^Animacje$/i })).toBeTruthy();
  });

  it("exposes Forma role settings notes edit switch", () => {
    renderClient();
    startDrumsRole();
    expect(screen.getByTestId("drums-pane")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Ustawienia Forma/i }));
    expect(screen.getByRole("switch", { name: /Edycja notatek Formy/i })).toBeTruthy();
  });

});
