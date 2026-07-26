/**
 * @vitest-environment jsdom
 */
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/desktopBridge.js", () => ({
  isDesktopShell: () => false,
  checkDesktopUpdate: vi.fn(),
  installDesktopUpdate: vi.fn(),
  openExternalUrl: vi.fn(),
  formatUnknownError: (e: unknown) => String(e),
}));

vi.mock("../../lib/setlistApi.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/setlistApi.js")>();
  return {
    ...actual,
    clearHostLogs: vi.fn(async () => undefined),
    downloadDiagnosticsExport: vi.fn(async () => undefined),
    fetchNetworkInfo: vi.fn(async () => ({
      port: 8787,
      hostname: "stage",
      lanAddresses: ["192.168.1.10"],
      urls: ["http://192.168.1.10:8787", "http://localhost:8787"],
      version: "5.2.3",
      mdnsEnabled: true,
    })),
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
    apkDownloadUrlsFromJoin: () => ({
      performer: "http://192.168.1.10:8787/downloads/stagesync-performer.apk",
      console: "http://192.168.1.10:8787/downloads/stagesync-console.apk",
    }),
    probeApkAvailable: vi.fn(async () => true),
    postApplyHostUpdate: vi.fn(async () => undefined),
    postSafetyNetPromote: vi.fn(async () => undefined),
  };
});

import { SystemView } from "./SystemView.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }),
  );
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
  it("names Pobierz APK and Releases per app title", async () => {
    render(<SystemView statusMsg={null} />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Pobierz APK StageSync Performer" }),
      ).toBeTruthy();
    });
    expect(
      screen.getByRole("button", { name: "Pobierz APK StageSync Console" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Releases — StageSync Performer" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Releases — StageSync Console" }),
    ).toBeTruthy();
  });

  it("names Host card regions in two-column order", async () => {
    render(<SystemView statusMsg={null} />);
    await waitFor(() => {
      expect(
        screen.getByRole("region", { name: "Połączenie i sieć" }),
      ).toBeTruthy();
    });
    expect(
      screen.getByRole("region", { name: "O aplikacji i aktualizacje" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "Logi serwera" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "MIDI i Safety Net" }),
    ).toBeTruthy();
  });

  it("shows mDNS .local join URL next to LAN addresses", async () => {
    render(<SystemView statusMsg={null} />);
    await waitFor(() => {
      expect(screen.getByText("http://stage.local:8787")).toBeTruthy();
    });
    expect(screen.getByText("http://192.168.1.10:8787")).toBeTruthy();
  });

  it("on mobile expands one Host card at a time", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("max-width"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }));

    render(<SystemView statusMsg={null} />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Połączenie & Sieć/ }),
      ).toBeTruthy();
    });

    const networkToggle = screen.getByRole("button", {
      name: /Połączenie & Sieć/,
    });
    expect(networkToggle.getAttribute("aria-expanded")).toBe("true");
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
        screen.getByRole("button", { name: /Logi serwera/ }).getAttribute(
          "aria-expanded",
        ),
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
});
