/**
 * @vitest-environment jsdom
 */
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@lib/client/desktopBridge.js", () => ({
  canUseDesktopUpdater: () => false,
  checkDesktopUpdate: vi.fn(),
  installDesktopUpdate: vi.fn(),
  openExternalUrl: vi.fn(),
  formatUnknownError: (e: unknown) => String(e),
  isDesktopShell: () => false,
}));

/** Sync mock — async importOriginal can race under coverage and leave real fetch hanging. */
const setlistMocks = vi.hoisted(() => {
  const networkInfo = {
    port: 8787,
    hostname: "stage",
    lanAddresses: ["192.168.1.10"],
    urls: ["http://192.168.1.10:8787", "http://localhost:8787"],
    version: "5.2.3",
    mdnsEnabled: true,
  };
  return {
    networkInfo,
    clearHostLogs: vi.fn(async () => undefined),
    downloadDiagnosticsExport: vi.fn(async () => undefined),
    fetchNetworkInfo: vi.fn(async () => networkInfo),
    fetchMidiHostStatus: vi.fn(async () => ({
      available: false,
      backend: "none",
      config: {
        inputId: null,
        outputId: null,
        clockOutEnabled: false,
        inputChannel: null,
        outputChannel: 0,
      },
      inputs: [],
      outputs: [],
      rates: {
        clockPerSec: 0,
        sppPerSec: 0,
        pcPerSec: 0,
        beatToWsPerSec: 0,
      },
      clockOutActive: false,
    })),
    fetchHostUpdateStatus: vi.fn(async () => ({
      current: "5.2.3",
      latest: null,
      updateAvailable: false,
    })),
    fetchSafetyNetStatus: vi.fn(async () => ({
      role: "master",
      midiOutAllowed: true,
    })),
    probeApkAvailable: vi.fn(async () => true),
    postApplyHostUpdate: vi.fn(async () => undefined),
    postSafetyNetPromote: vi.fn(async () => undefined),
  };
});

vi.mock("@lib/shell-operator/setlistApi.js", () => ({
  clearHostLogs: setlistMocks.clearHostLogs,
  downloadDiagnosticsExport: setlistMocks.downloadDiagnosticsExport,
  fetchNetworkInfo: setlistMocks.fetchNetworkInfo,
  fetchMidiHostStatus: setlistMocks.fetchMidiHostStatus,
  fetchHostUpdateStatus: setlistMocks.fetchHostUpdateStatus,
  fetchSafetyNetStatus: setlistMocks.fetchSafetyNetStatus,
  probeApkAvailable: setlistMocks.probeApkAvailable,
  postApplyHostUpdate: setlistMocks.postApplyHostUpdate,
  postSafetyNetPromote: setlistMocks.postSafetyNetPromote,
  pickPrimaryJoinUrl: (info: {
    lanAddresses: string[];
    port: number;
    urls: string[];
  }) => {
    const lan = info.lanAddresses[0];
    if (lan) return `http://${lan}:${info.port}`;
    return info.urls[0] ?? null;
  },
  networkDisplayUrls: (info: {
    port: number;
    hostname: string;
    urls: string[];
    mdnsEnabled?: boolean;
  }) => {
    if (info.mdnsEnabled !== true) return info.urls;
    const host = info.hostname.trim();
    if (!host || host === "localhost" || host === "127.0.0.1") return info.urls;
    const mdns = `http://${host}.local:${info.port}`;
    if (info.urls.includes(mdns)) return info.urls;
    const localhostIdx = info.urls.findIndex((u) =>
      /localhost|127\.0\.0\.1/i.test(u),
    );
    if (localhostIdx < 0) return [...info.urls, mdns];
    return [
      ...info.urls.slice(0, localhostIdx),
      mdns,
      ...info.urls.slice(localhostIdx),
    ];
  },
  apkDownloadUrlsFromJoin: (join: string) => {
    try {
      const origin = new URL(join).origin;
      return {
        performer: `${origin}/downloads/stagesync-performer.apk`,
        console: `${origin}/downloads/stagesync-console.apk`,
      };
    } catch {
      return null;
    }
  },
}));

import { SystemView } from "./SystemView.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  setlistMocks.fetchNetworkInfo.mockResolvedValue(setlistMocks.networkInfo);
  setlistMocks.probeApkAvailable.mockResolvedValue(true);
  setlistMocks.fetchHostUpdateStatus.mockResolvedValue({
    current: "5.2.3",
    latest: null,
    updateAvailable: false,
  });
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  }));
  vi.stubGlobal(
    "EventSource",
    class {
      close() {}
      addEventListener() {}
      removeEventListener() {}
      onmessage = null;
      onerror = null;
      readyState = 1;
    },
  );
});

describe("SystemView APK download aria", () => {
  it("names Pobierz APK per app title and opens QR modal", async () => {
    render(
      <MemoryRouter>
        <SystemView statusMsg={null} />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Pobierz APK StageSync Performer" }),
      ).toBeTruthy();
    });
    expect(
      screen.getByRole("button", { name: "Pobierz APK StageSync Console" }),
    ).toBeTruthy();
    act(() => {
      screen
        .getByRole("button", { name: "Pobierz APK StageSync Performer" })
        .click();
    });
    expect(
      screen.getByRole("dialog", { name: "Pobierz APK — StageSync Performer" }),
    ).toBeTruthy();
    expect(screen.getByText(/Zeskanuj kod na telefonie/)).toBeTruthy();
  });

  it("names Host card regions in two-column order", async () => {
    render(
      <MemoryRouter>
        <SystemView statusMsg={null} />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(
        screen.getByRole("region", { name: "Połączenie i sieć" }),
      ).toBeTruthy();
    });
    expect(
      screen.getByRole("region", { name: "O aplikacji i aktualizacje" }),
    ).toBeTruthy();
    expect(screen.getByRole("region", { name: "Logi serwera" })).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "MIDI i Safety Net" }),
    ).toBeTruthy();
  });

  it("shows mDNS .local join URL next to LAN addresses", async () => {
    render(
      <MemoryRouter>
        <SystemView statusMsg={null} />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText("http://stage.local:8787")).toBeTruthy();
    });
    expect(screen.getByText("http://192.168.1.10:8787")).toBeTruthy();
  });

  it("copies network URL on address click", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <MemoryRouter>
        <SystemView statusMsg={null} />
      </MemoryRouter>,
    );
    const urlBtn = await screen.findByRole("button", {
      name: "Kopiuj adres: http://192.168.1.10:8787",
    });
    await act(async () => {
      urlBtn.click();
    });
    expect(writeText).toHaveBeenCalledWith("http://192.168.1.10:8787");
    expect(
      screen.getByRole("button", {
        name: "Skopiowano adres: http://192.168.1.10:8787",
      }),
    ).toBeTruthy();
  });

  it("on compact mobile expands one Host card at a time", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches:
        query.includes("max-width: 640px") || query === "(max-width: 640px)",
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }));

    render(
      <MemoryRouter>
        <SystemView statusMsg={null} />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Połączenie & Sieć/ }),
      ).toBeTruthy();
    });

    const networkToggle = screen.getByRole("button", {
      name: /Połączenie & Sieć/,
    });
    expect(networkToggle.getAttribute("aria-expanded")).toBe("true");
    expect(networkToggle.textContent).not.toMatch(/[▸▾▶▼]/);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Pobierz APK StageSync Performer" }),
      ).toBeTruthy();
    });

    act(() => {
      screen.getByRole("button", { name: /Logi serwera/ }).click();
    });
    await waitFor(() => {
      expect(
        screen
          .getByRole("button", { name: /Logi serwera/ })
          .getAttribute("aria-expanded"),
      ).toBe("true");
    });
    expect(networkToggle.getAttribute("aria-expanded")).toBe("false");
    expect(
      screen.queryByRole("button", { name: "Pobierz APK StageSync Performer" }),
    ).toBeNull();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Pobierz paczkę diagnostyki ZIP" }),
      ).toBeTruthy();
    });
  });

  it("hides Aktualizuj host when update exists but Watchtower apply is unavailable", async () => {
    setlistMocks.fetchHostUpdateStatus.mockResolvedValueOnce({
      current: "5.2.5",
      latest: "5.2.6",
      updateAvailable: true,
      applyAvailable: false,
      updateMode: "manual",
      error: null,
    });

    render(
      <MemoryRouter>
        <SystemView statusMsg={null} />
      </MemoryRouter>,
    );
    const check = await screen.findByRole("button", {
      name: "Sprawdź aktualizacje",
    });
    await act(async () => {
      check.click();
    });
    await waitFor(() => {
      expect(screen.getByText(/Host: 5\.2\.5 → 5\.2\.6/)).toBeTruthy();
    });
    expect(
      screen.queryByRole("button", { name: "Aktualizuj host" }),
    ).toBeNull();
    expect(screen.getByText(/compose\.prod\.yml/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Releases" })).toBeTruthy();
  });
});
