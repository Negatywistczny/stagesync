import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AddressInfo } from "node:net";
import { WebSocket } from "ws";
import { attachTransportWs, TRANSPORT_WS_PATH } from "./ws.js";
import { createTransportEngine, type TransportEngine } from "./engine.js";
import { createClientPresence } from "../client-presence.js";
import type { LiveDeskStore } from "../live-desk.js";
import type { SetlistHub } from "./setlist-hub.js";
import type { StageHub } from "./stage-hub.js";

function parseMessage(data: WebSocket.RawData): unknown {
  return JSON.parse(String(data));
}

function waitForMessage(ws: WebSocket): Promise<unknown> {
  return new Promise((resolve, reject) => {
    ws.once("error", reject);
    ws.once("message", (data) => resolve(parseMessage(data)));
  });
}

function waitForMessages(ws: WebSocket, count: number): Promise<unknown[]> {
  const out: unknown[] = [];
  return new Promise((resolve, reject) => {
    const onMsg = (data: WebSocket.RawData) => {
      out.push(parseMessage(data));
      if (out.length >= count) {
        ws.off("message", onMsg);
        resolve(out);
      }
    };
    ws.once("error", reject);
    ws.on("message", onMsg);
  });
}

describe("attachTransportWs integration", () => {
  let server: Server;
  let wsUrl: string;
  let transport: TransportEngine;
  let wss: ReturnType<typeof attachTransportWs>;

  async function startServer(
    opts?: {
      stageHub?: StageHub;
      presence?: ReturnType<typeof createClientPresence>;
      liveDesk?: LiveDeskStore;
      setlistHub?: SetlistHub;
    },
  ): Promise<void> {
    transport = createTransportEngine();
    server = createServer();
    wss = attachTransportWs(
      server,
      transport,
      opts?.stageHub,
      opts?.presence,
      opts?.liveDesk,
      opts?.setlistHub,
    );
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const { port } = server.address() as AddressInfo;
    wsUrl = `ws://127.0.0.1:${port}${TRANSPORT_WS_PATH}`;
  }

  async function stopServer(): Promise<void> {
    transport.dispose();
    wss.close();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }

  beforeEach(async () => {
    await startServer();
  });

  afterEach(async () => {
    await stopServer();
  });

  it("sends transport_tick on connect", async () => {
    const ws = new WebSocket(wsUrl);
    const first = await waitForMessage(ws);
    expect(first).toMatchObject({ type: "transport_tick" });
    ws.close();
    await new Promise<void>((r) => ws.once("close", () => r()));
  });

  it("broadcasts transport changes to multiple open clients", async () => {
    const a = new WebSocket(wsUrl);
    const b = new WebSocket(wsUrl);
    await waitForMessage(a);
    await waitForMessage(b);

    const aNext = waitForMessage(a);
    const bNext = waitForMessage(b);
    transport.seek(1920);
    const [tickA, tickB] = await Promise.all([aNext, bNext]);
    expect(tickA).toMatchObject({ type: "transport_tick", positionTicks: 1920 });
    expect(tickB).toMatchObject({ type: "transport_tick", positionTicks: 1920 });

    a.close();
    b.close();
    await Promise.all([
      new Promise<void>((r) => a.once("close", () => r())),
      new Promise<void>((r) => b.once("close", () => r())),
    ]);
  });

  it("handshakes optional hub snapshots in order", async () => {
    await stopServer();

    const liveDesk = {
      snapshotMessage: () => ({ type: "live_desk_snapshot", channels: [] }),
      onMessage: () => () => {},
    } as LiveDeskStore;
    const setlistHub = {
      snapshotMessage: () => ({ type: "setlist_snapshot", items: [] }),
      onMessage: () => () => {},
    } as SetlistHub;
    const stageHub = {
      snapshotCues: () => [
        { type: "stage_cue", text: "Go", priority: "normal" as const },
      ],
      onMessage: () => () => {},
    } as StageHub;

    await startServer({ liveDesk, setlistHub, stageHub });

    const ws = new WebSocket(wsUrl);
    const msgs = await waitForMessages(ws, 4);
    expect(msgs[0]).toMatchObject({ type: "transport_tick" });
    expect(msgs[1]).toMatchObject({ type: "live_desk_snapshot" });
    expect(msgs[2]).toMatchObject({ type: "setlist_snapshot" });
    expect(msgs[3]).toMatchObject({ type: "stage_cue", text: "Go" });
    ws.close();
    await new Promise<void>((r) => ws.once("close", () => r()));
  });

  it("upserts presence on client_hello and ignores oversized / malformed messages", async () => {
    await stopServer();
    const presence = createClientPresence();
    await startServer({ presence });

    const ws = new WebSocket(wsUrl);
    await waitForMessage(ws);
    ws.send(
      JSON.stringify({
        type: "client_hello",
        displayName: "  Alice  ",
        roles: ["karaoke"],
        latencyMs: 12,
      }),
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(presence.list()).toMatchObject([
      { displayName: "Alice", roles: ["karaoke"] },
    ]);

    ws.send("{not-json");
    ws.send("x".repeat(9000));
    expect(presence.list()).toHaveLength(1);

    await new Promise<void>((resolve) => {
      ws.once("close", () => resolve());
      ws.close();
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(presence.list()).toHaveLength(0);
  });

  it("unsubscribes transport listener when wss closes", async () => {
    const a = new WebSocket(wsUrl);
    await waitForMessage(a);

    wss.close();
    transport.seek(3840);
    await new Promise((r) => setTimeout(r, 30));

    let extra = false;
    a.on("message", () => {
      extra = true;
    });
    await new Promise((r) => setTimeout(r, 30));
    expect(extra).toBe(false);

    a.close();
    await new Promise<void>((r) => a.once("close", () => r()));
  });

  it("continues broadcast when one client send throws", async () => {
    const a = new WebSocket(wsUrl);
    const b = new WebSocket(wsUrl);
    await waitForMessage(a);
    await waitForMessage(b);

    const originalSend = WebSocket.prototype.send;
    vi.spyOn(WebSocket.prototype, "send").mockImplementation(function (
      this: WebSocket,
      ...args: Parameters<WebSocket["send"]>
    ) {
      if (this === a) throw new Error("socket broken");
      return originalSend.apply(this, args);
    });

    const bNext = waitForMessage(b);
    transport.seek(960);
    const tick = await bNext;
    expect(tick).toMatchObject({ type: "transport_tick", positionTicks: 960 });

    vi.restoreAllMocks();
    a.close();
    b.close();
    await Promise.all([
      new Promise<void>((r) => a.once("close", () => r())),
      new Promise<void>((r) => b.once("close", () => r())),
    ]);
  });
});
