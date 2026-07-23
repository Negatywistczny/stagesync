/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultTransportState, type TransportState } from "@stagesync/shared";
import type { ReactNode } from "react";

const {
  getTransport,
  playTransport,
  pauseTransport,
  stopTransport,
  seekTransport,
  setTransportLoop,
  fetchLiveDesk,
  wsReconnectDelayMs,
} = vi.hoisted(() => ({
  getTransport: vi.fn(),
  playTransport: vi.fn(),
  pauseTransport: vi.fn(),
  stopTransport: vi.fn(),
  seekTransport: vi.fn(),
  setTransportLoop: vi.fn(),
  fetchLiveDesk: vi.fn(),
  wsReconnectDelayMs: vi.fn(() => 1000),
}));

vi.mock("./api.js", () => ({
  getTransport,
  playTransport,
  pauseTransport,
  stopTransport,
  seekTransport,
  setTransportLoop,
}));

vi.mock("../lib/setlistApi.js", () => ({
  fetchLiveDesk,
}));

vi.mock("./wsReconnect.js", () => ({
  wsReconnectDelayMs,
}));

import { TransportProvider } from "./TransportProvider.js";
import { useTransport } from "./useTransport.js";

const CUE_ID = "00000000-0000-4000-8000-000000000001";
const CUE_ID_B = "00000000-0000-4000-8000-000000000002";

type MockWs = {
  url: string;
  readyState: number;
  onopen: ((ev: Event) => void) | null;
  onmessage: ((ev: MessageEvent) => void) | null;
  onclose: ((ev: CloseEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  triggerOpen: () => void;
  triggerMessage: (data: unknown) => void;
  triggerClose: () => void;
  triggerError: () => void;
};

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWs[] = [];

  url: string;
  readyState = MockWebSocket.CONNECTING;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
  });

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  triggerOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event("open"));
  }

  triggerMessage(data: unknown) {
    const payload = typeof data === "string" ? data : JSON.stringify(data);
    this.onmessage?.(new MessageEvent("message", { data: payload }));
  }

  triggerClose() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent("close"));
  }

  triggerError() {
    this.onerror?.(new Event("error"));
  }
}

const rafQueue: FrameRequestCallback[] = [];
let nextRafId = 1;
const cancelledRaf = new Set<number>();

function flushRaf(frameTime = 16) {
  const batch = rafQueue.splice(0);
  for (const cb of batch) {
    cb(frameTime);
  }
}

function wrapper({ children }: { children: ReactNode }) {
  return <TransportProvider>{children}</TransportProvider>;
}

function snap(
  overrides: Partial<TransportState> = {},
  serverTimeMs = 1,
): { state: TransportState; serverTimeMs: number } {
  return {
    state: { ...defaultTransportState(), ...overrides },
    serverTimeMs,
  };
}

function tickPayload(
  overrides: Partial<TransportState> & {
    serverTimeMs?: number;
    sentAtMs?: number;
  } = {},
) {
  const { serverTimeMs = 10, sentAtMs, ...state } = overrides;
  return {
    ...defaultTransportState(),
    ...state,
    type: "transport_tick" as const,
    serverTimeMs,
    ...(sentAtMs !== undefined ? { sentAtMs } : {}),
  };
}

async function flushMicrotasks(times = 4) {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

async function mountProvider() {
  const utils = renderHook(() => useTransport(), { wrapper });
  await flushMicrotasks();
  return utils;
}

async function openLatestWs() {
  const ws = MockWebSocket.instances.at(-1);
  expect(ws).toBeDefined();
  await act(async () => {
    ws!.triggerOpen();
  });
  await flushMicrotasks();
  return ws!;
}

describe("TransportProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    rafQueue.length = 0;
    nextRafId = 1;
    cancelledRaf.clear();

    vi.stubGlobal("WebSocket", MockWebSocket);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      const id = nextRafId++;
      rafQueue.push((t) => {
        if (!cancelledRaf.has(id)) cb(t);
      });
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      cancelledRaf.add(id);
    });

    getTransport.mockReset().mockResolvedValue(snap());
    playTransport.mockReset().mockResolvedValue(snap({ playing: true }));
    pauseTransport.mockReset().mockResolvedValue(snap({ playing: false }));
    stopTransport.mockReset().mockResolvedValue(snap({ positionTicks: 0 }));
    seekTransport.mockReset().mockResolvedValue(snap({ positionTicks: 960 }));
    setTransportLoop
      .mockReset()
      .mockResolvedValue(
        snap({
          loop: { enabled: true, startTicks: 0, endTicks: 480 },
        }),
      );
    fetchLiveDesk.mockReset().mockResolvedValue({
      transpositionSemitones: 2,
      syncLeadMs: 100,
      clientEditEnabled: false,
    });
    wsReconnectDelayMs.mockReset().mockReturnValue(1000);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("mount", () => {
    it("loads transport + live desk then connects WS", async () => {
      const { result } = await mountProvider();

      expect(getTransport).toHaveBeenCalled();
      expect(fetchLiveDesk).toHaveBeenCalled();
      expect(result.current.state.positionTicks).toBe(0);
      expect(result.current.liveDesk).toEqual({
        transpositionSemitones: 2,
        syncLeadMs: 100,
        clientEditEnabled: false,
      });
      expect(result.current.wsStatus).toBe("connecting");
      expect(MockWebSocket.instances).toHaveLength(1);
      expect(MockWebSocket.instances[0]!.url).toContain("/ws/transport");
    });

    it("sets error when initial getTransport rejects", async () => {
      getTransport.mockRejectedValueOnce(new Error("offline"));
      const { result } = await mountProvider();

      expect(result.current.error).toBe("offline");
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    it("continues when fetchLiveDesk rejects", async () => {
      fetchLiveDesk.mockRejectedValueOnce(new Error("desk down"));
      const { result } = await mountProvider();

      expect(result.current.error).toBeNull();
      expect(result.current.liveDesk.syncLeadMs).toBe(200);
      expect(MockWebSocket.instances).toHaveLength(1);
    });
  });

  describe("WS lifecycle", () => {
    it("on open: status connected, hello interval, refreshes snapshot", async () => {
      getTransport
        .mockResolvedValueOnce(snap())
        .mockResolvedValueOnce(snap({ positionTicks: 240 }, 5));

      const { result } = await mountProvider();
      const ws = await openLatestWs();

      expect(result.current.wsStatus).toBe("connected");
      expect(result.current.state.positionTicks).toBe(240);
      expect(ws.send).not.toHaveBeenCalled();

      await act(async () => {
        result.current.announcePresence({
          displayName: "Op",
          roles: ["grid"],
        });
      });
      expect(ws.send).toHaveBeenCalledTimes(1);
      expect(JSON.parse(String(ws.send.mock.calls[0]![0]))).toMatchObject({
        type: "client_hello",
        displayName: "Op",
        roles: ["grid"],
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
      expect(ws.send).toHaveBeenCalledTimes(2);
    });

    it("reconnects after close using wsReconnectDelayMs", async () => {
      const { result } = await mountProvider();
      const ws = await openLatestWs();

      await act(async () => {
        ws.triggerClose();
      });

      expect(result.current.wsStatus).toBe("disconnected");
      expect(result.current.stageCues).toEqual([]);
      expect(wsReconnectDelayMs).toHaveBeenCalledWith(0);
      expect(MockWebSocket.instances).toHaveLength(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      await flushMicrotasks();

      expect(MockWebSocket.instances).toHaveLength(2);
      expect(result.current.wsStatus).toBe("connecting");
    });

    it("onerror is a no-op (reconnect via onclose)", async () => {
      await mountProvider();
      const ws = await openLatestWs();
      await act(async () => {
        ws.triggerError();
      });
      expect(MockWebSocket.instances).toHaveLength(1);
      expect(wsReconnectDelayMs).not.toHaveBeenCalled();
    });

    it("unmount clears timers, rAF and closes socket", async () => {
      const { result, unmount } = await mountProvider();
      const ws = await openLatestWs();

      await act(async () => {
        ws.triggerMessage(tickPayload({ playing: true, positionTicks: 100 }));
      });
      expect(rafQueue.length).toBeGreaterThan(0);

      await act(async () => {
        result.current.announcePresence({ displayName: "A", roles: [] });
      });

      unmount();

      expect(ws.close).toHaveBeenCalled();
      const sendCount = ws.send.mock.calls.length;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
      expect(ws.send).toHaveBeenCalledTimes(sendCount);

      await act(async () => {
        ws.triggerClose();
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(MockWebSocket.instances).toHaveLength(1);
    });
  });

  describe("ws.onmessage", () => {
    it("applies transport_tick and starts rAF when playing", async () => {
      const { result } = await mountProvider();
      const ws = await openLatestWs();

      await act(async () => {
        ws.triggerMessage(
          tickPayload({
            playing: true,
            positionTicks: 480,
            serverTimeMs: 20,
            sentAtMs: Date.now() - 40,
          }),
        );
      });

      expect(result.current.state.playing).toBe(true);
      expect(result.current.displayTicks).toBe(480);
      expect(result.current.latencyMs).not.toBeNull();
      expect(rafQueue.length).toBeGreaterThan(0);

      await act(async () => {
        flushRaf(100);
      });
      expect(result.current.displayTicks).toBeGreaterThanOrEqual(480);
    });

    it("drops out-of-order ticks", async () => {
      const { result } = await mountProvider();
      const ws = await openLatestWs();

      await act(async () => {
        ws.triggerMessage(
          tickPayload({ positionTicks: 1000, serverTimeMs: 50 }),
        );
      });
      await act(async () => {
        ws.triggerMessage(
          tickPayload({ positionTicks: 1, serverTimeMs: 40 }),
        );
      });

      expect(result.current.state.positionTicks).toBe(1000);
    });

    it("handles stage_cue upsert and dismiss by id / clearAll", async () => {
      const { result } = await mountProvider();
      const ws = await openLatestWs();

      await act(async () => {
        ws.triggerMessage({
          type: "stage_cue",
          id: CUE_ID,
          text: "GO",
          ttlMs: 1000,
          sentAtMs: 1,
        });
      });
      expect(result.current.stageCue?.text).toBe("GO");
      expect(result.current.stageCues).toHaveLength(1);

      await act(async () => {
        ws.triggerMessage({
          type: "stage_cue",
          id: CUE_ID,
          text: "UPDATED",
          ttlMs: 2000,
          sentAtMs: 2,
        });
      });
      expect(result.current.stageCues).toHaveLength(1);
      expect(result.current.stageCue?.text).toBe("UPDATED");

      await act(async () => {
        ws.triggerMessage({
          type: "stage_cue",
          id: CUE_ID_B,
          text: "SECOND",
          ttlMs: 1000,
          sentAtMs: 3,
        });
      });
      expect(result.current.stageCues).toHaveLength(2);

      await act(async () => {
        ws.triggerMessage({
          type: "stage_cue_dismiss",
          id: CUE_ID,
          sentAtMs: 4,
        });
      });
      expect(result.current.stageCues).toHaveLength(1);
      expect(result.current.stageCue?.id).toBe(CUE_ID_B);

      await act(async () => {
        ws.triggerMessage({
          type: "stage_cue_dismiss",
          clearAll: true,
          sentAtMs: 5,
        });
      });
      expect(result.current.stageCues).toEqual([]);
      expect(result.current.stageCue).toBeNull();
    });

    it("ignores stage_cue_dismiss without id or clearAll", async () => {
      const { result } = await mountProvider();
      const ws = await openLatestWs();

      await act(async () => {
        ws.triggerMessage({
          type: "stage_cue",
          text: "KEEP",
          ttlMs: 1000,
          sentAtMs: 1,
        });
        ws.triggerMessage({
          type: "stage_cue_dismiss",
          sentAtMs: 2,
        });
      });

      expect(result.current.stageCues).toHaveLength(1);
      expect(result.current.stageCue?.text).toBe("KEEP");
    });

    it("updates liveDesk from WS", async () => {
      const { result } = await mountProvider();
      const ws = await openLatestWs();

      await act(async () => {
        ws.triggerMessage({
          type: "live_desk",
          transpositionSemitones: -3,
          syncLeadMs: 250,
          clientEditEnabled: true,
          sentAtMs: 9,
        });
      });

      expect(result.current.liveDesk).toEqual({
        transpositionSemitones: -3,
        syncLeadMs: 250,
        clientEditEnabled: true,
      });
    });

    it("sets error on invalid JSON", async () => {
      const { result } = await mountProvider();
      const ws = await openLatestWs();

      await act(async () => {
        ws.triggerMessage("{not-json");
      });

      // formatTransportError prefers Error.message (SyntaxError) over fallback.
      expect(result.current.error).toMatch(/JSON|Unexpected|property name/i);
    });

    it("sets error only for malformed transport_tick frames", async () => {
      const { result } = await mountProvider();
      const ws = await openLatestWs();

      await act(async () => {
        ws.triggerMessage({ type: "unknown_frame", foo: 1 });
      });
      expect(result.current.error).toBeNull();

      await act(async () => {
        ws.triggerMessage({ type: "transport_tick", playing: "nope" });
      });
      // ZodError.message surfaces via formatTransportError.
      expect(result.current.error).toMatch(/Expected boolean|invalid_type/i);
    });

    it("stops rAF when tick says not playing", async () => {
      const { result } = await mountProvider();
      const ws = await openLatestWs();

      await act(async () => {
        ws.triggerMessage(tickPayload({ playing: true, serverTimeMs: 1 }));
      });
      const pending = rafQueue.length;
      expect(pending).toBeGreaterThan(0);

      await act(async () => {
        ws.triggerMessage(
          tickPayload({ playing: false, positionTicks: 10, serverTimeMs: 2 }),
        );
      });
      rafQueue.length = 0;
      await act(async () => {
        flushRaf(50);
      });
      expect(result.current.state.playing).toBe(false);
    });

    it("rAF loop exits cleanly when playingRef flips before frame", async () => {
      vi.stubGlobal("cancelAnimationFrame", () => {
        /* leave queued frames so loop can observe !playing */
      });
      const { result } = await mountProvider();
      const ws = await openLatestWs();

      await act(async () => {
        ws.triggerMessage(
          tickPayload({ playing: true, positionTicks: 0, serverTimeMs: 1 }),
        );
      });
      expect(rafQueue.length).toBeGreaterThan(0);

      await act(async () => {
        ws.triggerMessage(
          tickPayload({ playing: false, positionTicks: 0, serverTimeMs: 2 }),
        );
      });
      await act(async () => {
        flushRaf(30);
      });
      expect(result.current.state.playing).toBe(false);
    });

    it("ignores malformed non-object JSON without setting tick error", async () => {
      const { result } = await mountProvider();
      const ws = await openLatestWs();

      await act(async () => {
        ws.triggerMessage("42");
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe("commands", () => {
    it("play/pause/stop/seek/setLoop call API and clear pending", async () => {
      const { result } = await mountProvider();
      await openLatestWs();

      await act(async () => {
        await result.current.play({});
      });
      expect(playTransport).toHaveBeenCalled();
      expect(result.current.commandPending).toBe(false);
      expect(result.current.state.playing).toBe(true);

      await act(async () => {
        await result.current.pause();
      });
      expect(pauseTransport).toHaveBeenCalled();

      await act(async () => {
        await result.current.stop();
      });
      expect(stopTransport).toHaveBeenCalled();

      await act(async () => {
        await result.current.seek(960);
      });
      expect(seekTransport).toHaveBeenCalledWith(960);
      expect(result.current.state.positionTicks).toBe(960);

      await act(async () => {
        await result.current.setLoop({
          enabled: true,
          startTicks: 0,
          endTicks: 480,
        });
      });
      expect(setTransportLoop).toHaveBeenCalled();
      expect(result.current.state.loop).toEqual({
        enabled: true,
        startTicks: 0,
        endTicks: 480,
      });
    });

    it("blocks overlapping commands while pending", async () => {
      let resolvePlay!: (v: {
        state: TransportState;
        serverTimeMs: number;
      }) => void;
      playTransport.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePlay = resolve;
          }),
      );

      const { result } = await mountProvider();
      await openLatestWs();

      let playDone = false;
      await act(async () => {
        void result.current.play().then(() => {
          playDone = true;
        });
      });
      await flushMicrotasks();
      expect(result.current.commandPending).toBe(true);

      await act(async () => {
        await result.current.pause();
      });
      expect(pauseTransport).not.toHaveBeenCalled();

      await act(async () => {
        resolvePlay(snap({ playing: true }, 7));
      });
      await flushMicrotasks(8);
      expect(playDone).toBe(true);
      expect(result.current.commandPending).toBe(false);
    });

    it("surfaces command errors via formatTransportError", async () => {
      playTransport.mockRejectedValueOnce(new Error("denied"));
      const { result } = await mountProvider();
      await openLatestWs();

      await act(async () => {
        await result.current.play();
      });

      expect(result.current.error).toBe("denied");
      expect(result.current.commandPending).toBe(false);
    });
  });

  describe("presence", () => {
    it("announcePresence stores hello and sends when socket open", async () => {
      const { result } = await mountProvider();

      await act(async () => {
        result.current.announcePresence({
          displayName: "Early",
          roles: ["karaoke"],
        });
      });
      expect(MockWebSocket.instances[0]!.send).not.toHaveBeenCalled();

      const ws = await openLatestWs();
      expect(ws.send).toHaveBeenCalled();
      const hello = JSON.parse(String(ws.send.mock.calls[0]![0]));
      expect(hello).toMatchObject({
        type: "client_hello",
        displayName: "Early",
        roles: ["karaoke"],
        latencyMs: null,
      });
    });

    it("includes latency EMA in later hellos after tick samples", async () => {
      const { result } = await mountProvider();
      const ws = await openLatestWs();

      await act(async () => {
        result.current.announcePresence({
          displayName: "Lat",
          roles: [],
        });
        ws.triggerMessage(
          tickPayload({
            serverTimeMs: 11,
            sentAtMs: Date.now() - 120,
          }),
        );
        result.current.announcePresence({
          displayName: "Lat",
          roles: [],
        });
      });

      const last = JSON.parse(
        String(ws.send.mock.calls[ws.send.mock.calls.length - 1]![0]),
      );
      expect(last.latencyMs).toEqual(expect.any(Number));
      expect(last.latencyMs).toBeGreaterThan(0);
    });
  });

  describe("on-open snapshot", () => {
    it("starts rAF when open-refresh snapshot is playing", async () => {
      getTransport
        .mockResolvedValueOnce(snap())
        .mockResolvedValueOnce(snap({ playing: true, positionTicks: 50 }, 3));

      await mountProvider();
      await openLatestWs();
      expect(rafQueue.length).toBeGreaterThan(0);
    });

    it("swallows getTransport failure on open", async () => {
      getTransport
        .mockResolvedValueOnce(snap({ positionTicks: 12 }, 1))
        .mockRejectedValueOnce(new Error("refresh fail"));

      const { result } = await mountProvider();
      expect(result.current.state.positionTicks).toBe(12);
      await openLatestWs();
      expect(result.current.state.positionTicks).toBe(12);
      expect(result.current.error).toBeNull();
    });
  });
});
