/**
 * Native MIDI via easymidi (@julusian/midi). Optional — falls back when unloadable.
 */

import { createRequire } from "node:module";
import type {
  MidiBackend,
  MidiPortInfo,
  MidiRealtimeMessage,
} from "./backend.js";

type EasyMidiModule = {
  getInputs: () => string[];
  getOutputs: () => string[];
  Input: new (
    name: string,
    virtual?: boolean,
  ) => {
    on: (event: string, cb: (msg: Record<string, unknown>) => void) => void;
    close: () => void;
  };
  Output: new (
    name: string,
    virtual?: boolean,
  ) => {
    send: (type: string, args?: Record<string, unknown>) => void;
    close: () => void;
  };
};

function tryLoadEasyMidi(): EasyMidiModule | null {
  try {
    const require = createRequire(import.meta.url);
    return require("easymidi") as EasyMidiModule;
  } catch {
    return null;
  }
}

function portId(direction: "input" | "output", name: string): string {
  return `${direction}:${name}`;
}

function parsePortId(
  id: string,
  expected: "input" | "output",
): string | null {
  const prefix = `${expected}:`;
  if (!id.startsWith(prefix)) return null;
  return id.slice(prefix.length);
}

export function createNoneMidiBackend(): MidiBackend {
  return {
    kind: "none",
    listInputs: () => [],
    listOutputs: () => [],
    openInput() {
      throw new Error("MIDI backend unavailable");
    },
    closeInput() {},
    openOutput() {
      throw new Error("MIDI backend unavailable");
    },
    closeOutput() {},
    send() {},
    dispose() {},
  };
}

export function createNativeMidiBackend(): MidiBackend {
  const easymidi = tryLoadEasyMidi();
  if (!easymidi) {
    return createNoneMidiBackend();
  }

  // Module can load while RtMidi still fails (CI / headless hosts).
  try {
    easymidi.getInputs();
    easymidi.getOutputs();
  } catch {
    return createNoneMidiBackend();
  }

  let input: InstanceType<EasyMidiModule["Input"]> | null = null;
  let output: InstanceType<EasyMidiModule["Output"]> | null = null;

  const backend: MidiBackend = {
    kind: "native",

    listInputs(): MidiPortInfo[] {
      try {
        return easymidi.getInputs().map((name) => ({
          id: portId("input", name),
          name,
          direction: "input" as const,
        }));
      } catch {
        return [];
      }
    },

    listOutputs(): MidiPortInfo[] {
      try {
        return easymidi.getOutputs().map((name) => ({
          id: portId("output", name),
          name,
          direction: "output" as const,
        }));
      } catch {
        return [];
      }
    },

    openInput(id, onMessage) {
      const name = parsePortId(id, "input");
      if (!name) throw new Error(`Invalid MIDI input id: ${id}`);
      backend.closeInput();
      const port = new easymidi.Input(name);
      const forward = (msg: MidiRealtimeMessage) => onMessage(msg);
      port.on("clock", () => forward({ type: "clock" }));
      port.on("start", () => forward({ type: "start" }));
      port.on("stop", () => forward({ type: "stop" }));
      port.on("continue", () => forward({ type: "continue" }));
      port.on("position", (msg) => {
        const value = Number(msg.value);
        if (Number.isInteger(value) && value >= 0) {
          forward({ type: "spp", value });
        }
      });
      port.on("program", (msg) => {
        const program = Number(msg.number);
        const channel = Number(msg.channel);
        if (
          Number.isInteger(program) &&
          program >= 0 &&
          program <= 127 &&
          Number.isInteger(channel) &&
          channel >= 0 &&
          channel <= 15
        ) {
          forward({ type: "program", channel, program });
        }
      });
      input = port;
    },

    closeInput() {
      if (input) {
        try {
          input.close();
        } catch {
          /* ignore */
        }
        input = null;
      }
    },

    openOutput(id) {
      const name = parsePortId(id, "output");
      if (!name) throw new Error(`Invalid MIDI output id: ${id}`);
      backend.closeOutput();
      output = new easymidi.Output(name);
    },

    closeOutput() {
      if (output) {
        try {
          output.close();
        } catch {
          /* ignore */
        }
        output = null;
      }
    },

    send(msg) {
      if (!output) return;
      switch (msg.type) {
        case "clock":
          output.send("clock");
          break;
        case "start":
          output.send("start");
          break;
        case "stop":
          output.send("stop");
          break;
        case "continue":
          output.send("continue");
          break;
        case "spp":
          output.send("position", { value: msg.value });
          break;
        case "program":
          output.send("program", {
            number: msg.program,
            channel: msg.channel,
          });
          break;
      }
    },

    dispose() {
      backend.closeInput();
      backend.closeOutput();
    },
  };

  return backend;
}

/** Prefer native when loadable; otherwise empty "none" backend. */
export function createDefaultMidiBackend(): MidiBackend {
  const native = createNativeMidiBackend();
  return native.kind === "native" ? native : createNoneMidiBackend();
}
