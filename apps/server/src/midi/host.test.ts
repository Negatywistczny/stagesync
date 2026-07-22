import { afterEach, describe, expect, it, vi } from "vitest";
import { createTransportEngine } from "../transport/engine.js";
import { createMidiHost } from "./host.js";
import { createMockMidiBackend } from "./mock-backend.js";

describe("midi host", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists mock devices and applies config", () => {
    const transport = createTransportEngine();
    const backend = createMockMidiBackend();
    const host = createMidiHost(transport, { backend });

    const status = host.getStatus();
    expect(status.available).toBe(true);
    expect(status.backend).toBe("mock");
    expect(status.inputs).toHaveLength(1);
    expect(status.outputs).toHaveLength(1);

    host.setConfig({
      inputId: "mock-in-1",
      outputId: "mock-out-1",
      clockOutEnabled: true,
    });
    expect(host.getConfig().inputId).toBe("mock-in-1");
    expect(host.getConfig().outputId).toBe("mock-out-1");

    host.dispose();
    transport.dispose();
  });

  it("emits Start + SPP + Clock on play, Stop on stop", () => {
    vi.useFakeTimers();
    const transport = createTransportEngine({
      now: () => performance.now(),
    });
    const backend = createMockMidiBackend();
    const host = createMidiHost(transport, { backend });
    host.setConfig({
      outputId: "mock-out-1",
      clockOutEnabled: true,
    });

    transport.play({ bpm: 120 });
    expect(backend.sent.some((m) => m.type === "start")).toBe(true);
    expect(backend.sent.some((m) => m.type === "spp")).toBe(true);

    const before = backend.sent.filter((m) => m.type === "clock").length;
    vi.advanceTimersByTime(50);
    const after = backend.sent.filter((m) => m.type === "clock").length;
    expect(after).toBeGreaterThan(before);

    transport.stop();
    expect(backend.sent.some((m) => m.type === "stop")).toBe(true);

    host.dispose();
    transport.dispose();
  });

  it("re-emits SPP + Continue on seek while playing", () => {
    const transport = createTransportEngine({
      now: () => performance.now(),
    });
    const backend = createMockMidiBackend();
    const host = createMidiHost(transport, { backend });
    host.setConfig({
      outputId: "mock-out-1",
      clockOutEnabled: true,
    });

    transport.play({ bpm: 120 });
    backend.sent.length = 0;
    transport.seek(7680);
    expect(backend.sent.some((m) => m.type === "spp")).toBe(true);
    expect(backend.sent.some((m) => m.type === "continue")).toBe(true);

    host.dispose();
    transport.dispose();
  });

  it("meters clock / spp / pc / beat→ws from input", () => {
    const t = 1_000_000;
    const transport = createTransportEngine();
    const backend = createMockMidiBackend();
    const beats: number[] = [];
    const pcs: number[] = [];
    const host = createMidiHost(transport, {
      backend,
      now: () => t,
      onBeatToWs: () => beats.push(t),
      onProgramChange: (p) => pcs.push(p),
    });
    host.setConfig({ inputId: "mock-in-1" });

    for (let i = 0; i < 24; i++) {
      backend.emitInput({ type: "clock" });
    }
    backend.emitInput({ type: "spp", value: 4 });
    backend.emitInput({ type: "program", channel: 0, program: 7 });

    const rates = host.getStatus().rates;
    expect(rates.clockPerSec).toBe(24);
    expect(rates.sppPerSec).toBe(1);
    expect(rates.pcPerSec).toBe(1);
    expect(rates.beatToWsPerSec).toBe(1);
    expect(beats).toHaveLength(1);
    expect(pcs).toEqual([7]);

    host.dispose();
    transport.dispose();
  });

  it("sendProgramChange writes program to output", () => {
    const transport = createTransportEngine();
    const backend = createMockMidiBackend();
    const host = createMidiHost(transport, { backend });
    host.setConfig({ outputId: "mock-out-1" });
    host.sendProgramChange(42);
    expect(backend.sent).toContainEqual({
      type: "program",
      channel: 0,
      program: 42,
    });
    host.dispose();
    transport.dispose();
  });

  it("rejects unknown device ids without crashing status", () => {
    const transport = createTransportEngine();
    const backend = createMockMidiBackend();
    const host = createMidiHost(transport, { backend });
    host.setConfig({ inputId: "missing" });
    const status = host.getStatus();
    expect(status.lastError).toMatch(/Unknown MIDI input/);
    host.dispose();
    transport.dispose();
  });

  it("MIDI IN Start/Stop/Continue/SPP drive transport", () => {
    const nowMs = 1_000_000;
    const transport = createTransportEngine({
      now: () => nowMs,
      tickIntervalMs: 60_000,
    });
    const backend = createMockMidiBackend();
    const host = createMidiHost(transport, { backend });
    host.setConfig({ inputId: "mock-in-1" });

    backend.emitInput({ type: "spp", value: 4 }); // 960 ticks @ PPQ 960
    backend.emitInput({ type: "continue" });
    expect(transport.getState().playing).toBe(true);
    expect(transport.getState().positionTicks).toBe(960);

    backend.emitInput({ type: "stop" });
    expect(transport.getState().playing).toBe(false);
    expect(transport.getState().positionTicks).toBe(960);

    backend.emitInput({ type: "start" });
    expect(transport.getState().playing).toBe(true);
    expect(transport.getState().positionTicks).toBe(960);

    host.dispose();
    transport.dispose();
  });
});
