/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/desktopBridge.js", () => ({
  isDesktopShell: () => false,
  checkDesktopUpdate: vi.fn(),
  installDesktopUpdate: vi.fn(),
  openExternalUrl: vi.fn(),
  formatUnknownError: (e: unknown) => String(e),
}));

vi.mock("../../lib/setlistApi.js", () => ({
  clearHostLogs: vi.fn(async () => undefined),
  downloadDiagnosticsExport: vi.fn(async () => undefined),
  fetchNetworkInfo: vi.fn(async () => ({
    port: 8787,
    hostname: "stage.local",
    lanAddresses: ["192.168.1.10"],
    urls: ["http://192.168.1.10:8787"],
    version: "5.2.3",
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
  pickPrimaryJoinUrl: (info: { lanAddresses: string[]; port: number }) =>
    `http://${info.lanAddresses[0]}:${info.port}`,
  apkDownloadUrlsFromJoin: () => ({
    performer: "http://192.168.1.10:8787/downloads/stagesync-performer.apk",
    console: "http://192.168.1.10:8787/downloads/stagesync-console.apk",
  }),
  probeApkAvailable: vi.fn(async () => true),
  postApplyHostUpdate: vi.fn(async () => undefined),
  postSafetyNetPromote: vi.fn(async () => undefined),
}));

import { SystemView } from "./SystemView.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
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
        screen.getByRole("button", { name: "Pobierz APK Performer" }),
      ).toBeTruthy();
    });
    expect(
      screen.getByRole("button", { name: "Pobierz APK Console" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Releases — Performer" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Releases — Console" }),
    ).toBeTruthy();
  });

  it("names Host card regions including Logi strip", async () => {
    render(<SystemView statusMsg={null} />);
    await waitFor(() => {
      expect(
        screen.getByRole("region", { name: "Połączenie i sieć" }),
      ).toBeTruthy();
    });
    expect(
      screen.getByRole("region", { name: "MIDI i Safety Net" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "Aplikacje mobilne" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "O aplikacji i aktualizacje" }),
    ).toBeTruthy();
    expect(screen.getByRole("region", { name: "Logi" })).toBeTruthy();
  });

});
