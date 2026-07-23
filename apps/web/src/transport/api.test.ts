import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultTransportState } from "@stagesync/shared";
import {
  getTransport,
  loadTransport,
  pauseTransport,
  playTransport,
  seekTransport,
  setTransportLoop,
  stopTransport,
} from "./api.js";

function tickPayload(overrides: Record<string, unknown> = {}) {
  return {
    ...defaultTransportState(),
    type: "transport_tick",
    serverTimeMs: 42,
    ...overrides,
  };
}

function okTick(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => tickPayload(overrides),
  };
}

describe("transport api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("getTransport parses tick payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okTick({ playing: true }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await getTransport();
    expect(fetchMock).toHaveBeenCalledWith("/api/transport");
    expect(result.state.playing).toBe(true);
    expect(result.serverTimeMs).toBe(42);
  });

  it("playTransport validates body before POST", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okTick({ playing: true }));
    vi.stubGlobal("fetch", fetchMock);
    await playTransport({ bpm: 100 });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ bpm: 100 });
  });

  it("loadTransport / seek / loop POST validated bodies", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okTick())
      .mockResolvedValueOnce(okTick({ positionTicks: 960 }))
      .mockResolvedValueOnce(okTick());
    vi.stubGlobal("fetch", fetchMock);

    const projectId = "00000000-0000-4000-8000-000000000001";
    await loadTransport(projectId);
    await seekTransport(960);
    await setTransportLoop({ enabled: true, startTicks: 0, endTicks: 3840 });

    expect(fetchMock.mock.calls[0]![0]).toBe("/api/transport/load");
    expect(JSON.parse(String((fetchMock.mock.calls[0]![1] as RequestInit).body))).toEqual({
      projectId,
    });
    expect(JSON.parse(String((fetchMock.mock.calls[1]![1] as RequestInit).body))).toEqual({
      positionTicks: 960,
    });
    expect(JSON.parse(String((fetchMock.mock.calls[2]![1] as RequestInit).body))).toEqual({
      enabled: true,
      startTicks: 0,
      endTicks: 3840,
    });
  });

  it("pauseTransport and stopTransport POST without body", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okTick({ playing: false }))
      .mockResolvedValueOnce(okTick({ playing: false, positionTicks: 0 }));
    vi.stubGlobal("fetch", fetchMock);
    await pauseTransport();
    await stopTransport();
    expect(fetchMock.mock.calls[0]).toEqual([
      "/api/transport/pause",
      { method: "POST" },
    ]);
    expect(fetchMock.mock.calls[1]).toEqual([
      "/api/transport/stop",
      { method: "POST" },
    ]);
  });

  it("surfaces API error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: "busy" }),
      }),
    );
    await expect(getTransport()).rejects.toThrow("busy");
  });

  it("rejects invalid play body before fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      playTransport({ bpm: -1 } as never),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
