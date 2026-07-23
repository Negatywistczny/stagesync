import { describe, expect, it, vi } from "vitest";
import {
  createDefaultMidiBackend,
  createNativeMidiBackend,
  createNoneMidiBackend,
} from "./native-backend.js";
import type { MidiRealtimeMessage } from "./backend.js";

type Handler = (msg: Record<string, unknown>) => void;

function createMockEasyMidi(options?: {
  inputs?: string[];
  outputs?: string[];
  failList?: boolean;
}) {
  const inputs = options?.inputs ?? ["Virtual In"];
  const outputs = options?.outputs ?? ["Virtual Out"];
  const inputHandlers = new Map<string, Handler[]>();
  let lastOutput: {
    send: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  } | null = null;

  class Input {
    constructor(public name: string) {}
    on(event: string, cb: Handler) {
      const key = `${this.name}:${event}`;
      const list = inputHandlers.get(key) ?? [];
      list.push(cb);
      inputHandlers.set(key, list);
    }
    close = vi.fn();
  }

  class Output {
    send = vi.fn();
    close = vi.fn();
    constructor(public name: string) {
      lastOutput = { send: this.send, close: this.close };
    }
  }

  return {
    module: {
      getInputs: () => {
        if (options?.failList) throw new Error("rtmidi down");
        return [...inputs];
      },
      getOutputs: () => {
        if (options?.failList) throw new Error("rtmidi down");
        return [...outputs];
      },
      Input,
      Output,
    },
    emit(name: string, event: string, msg: Record<string, unknown> = {}) {
      for (const cb of inputHandlers.get(`${name}:${event}`) ?? []) {
        cb(msg);
      }
    },
    getLastOutput: () => lastOutput,
  };
}

describe("createNoneMidiBackend", () => {
  it("lists empty ports and rejects open", () => {
    const backend = createNoneMidiBackend();
    expect(backend.kind).toBe("none");
    expect(backend.listInputs()).toEqual([]);
    expect(backend.listOutputs()).toEqual([]);
    expect(() => backend.openInput("x", () => undefined)).toThrow(
      /unavailable/i,
    );
    expect(() => backend.openOutput("x")).toThrow(/unavailable/i);
    backend.send({ type: "clock" });
    backend.closeInput();
    backend.closeOutput();
    backend.dispose();
  });
});

describe("createNativeMidiBackend (mocked easymidi)", () => {
  it("falls back to none when module is null or list fails", () => {
    expect(createNativeMidiBackend(null).kind).toBe("none");
    const { module } = createMockEasyMidi({ failList: true });
    expect(createNativeMidiBackend(module).kind).toBe("none");
  });

  it("lists ports, opens I/O, forwards realtime + program, sends all types", () => {
    const mock = createMockEasyMidi();
    const backend = createNativeMidiBackend(mock.module);
    expect(backend.kind).toBe("native");
    expect(backend.listInputs()).toEqual([
      { id: "input:Virtual In", name: "Virtual In", direction: "input" },
    ]);
    expect(backend.listOutputs()).toEqual([
      { id: "output:Virtual Out", name: "Virtual Out", direction: "output" },
    ]);

    const received: MidiRealtimeMessage[] = [];
    backend.openInput("input:Virtual In", (msg) => received.push(msg));
    mock.emit("Virtual In", "clock");
    mock.emit("Virtual In", "start");
    mock.emit("Virtual In", "stop");
    mock.emit("Virtual In", "continue");
    mock.emit("Virtual In", "position", { value: 100 });
    mock.emit("Virtual In", "position", { value: -1 });
    mock.emit("Virtual In", "program", { number: 12, channel: 3 });
    mock.emit("Virtual In", "program", { number: 200, channel: 3 });
    expect(received).toEqual([
      { type: "clock" },
      { type: "start" },
      { type: "stop" },
      { type: "continue" },
      { type: "spp", value: 100 },
      { type: "program", channel: 3, program: 12 },
    ]);

    expect(() => backend.openInput("bad-id", () => undefined)).toThrow(
      /Invalid MIDI input/,
    );
    expect(() => backend.openOutput("bad-id")).toThrow(/Invalid MIDI output/);

    backend.openOutput("output:Virtual Out");
    const types: MidiRealtimeMessage[] = [
      { type: "clock" },
      { type: "start" },
      { type: "stop" },
      { type: "continue" },
      { type: "spp", value: 42 },
      { type: "program", channel: 1, program: 7 },
      { type: "cc", channel: 0, controller: 64, value: 127 },
    ];
    for (const msg of types) backend.send(msg);
    const out = mock.getLastOutput();
    expect(out?.send).toHaveBeenCalledWith("clock");
    expect(out?.send).toHaveBeenCalledWith("start");
    expect(out?.send).toHaveBeenCalledWith("stop");
    expect(out?.send).toHaveBeenCalledWith("continue");
    expect(out?.send).toHaveBeenCalledWith("position", { value: 42 });
    expect(out?.send).toHaveBeenCalledWith("program", {
      number: 7,
      channel: 1,
    });
    expect(out?.send).toHaveBeenCalledWith("cc", {
      controller: 64,
      value: 127,
      channel: 0,
    });

    backend.dispose();
    expect(out?.close).toHaveBeenCalled();
  });

  it("send is a no-op without open output", () => {
    const mock = createMockEasyMidi();
    const backend = createNativeMidiBackend(mock.module);
    backend.send({ type: "start" });
    expect(mock.getLastOutput()).toBeNull();
  });
});

describe("createDefaultMidiBackend", () => {
  it("returns a backend (native or none depending on host)", () => {
    const backend = createDefaultMidiBackend();
    expect(["native", "none"]).toContain(backend.kind);
    backend.dispose();
  });
});
