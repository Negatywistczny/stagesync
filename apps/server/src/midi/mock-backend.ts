/**
 * In-memory MIDI backend for tests (no hardware).
 */

import type {
  MidiBackend,
  MidiPortInfo,
  MidiRealtimeMessage,
} from "./backend.js";

export type MockMidiBackendOptions = {
  inputs?: MidiPortInfo[];
  outputs?: MidiPortInfo[];
};

export function createMockMidiBackend(
  options: MockMidiBackendOptions = {},
): MidiBackend & {
  /** Inject a message as if received on the open input. */
  emitInput(msg: MidiRealtimeMessage): void;
  /** Messages sent to the open output (tests). */
  readonly sent: MidiRealtimeMessage[];
} {
  const inputs = options.inputs ?? [
    { id: "mock-in-1", name: "Mock In 1", direction: "input" as const },
  ];
  const outputs = options.outputs ?? [
    { id: "mock-out-1", name: "Mock Out 1", direction: "output" as const },
  ];

  let inputHandler: ((msg: MidiRealtimeMessage) => void) | null = null;
  let openInputId: string | null = null;
  let openOutputId: string | null = null;
  const sent: MidiRealtimeMessage[] = [];

  return {
    kind: "mock",
    sent,

    listInputs() {
      return inputs.map((p) => ({ ...p }));
    },

    listOutputs() {
      return outputs.map((p) => ({ ...p }));
    },

    openInput(id, onMessage) {
      if (!inputs.some((p) => p.id === id)) {
        throw new Error(`Unknown MIDI input: ${id}`);
      }
      openInputId = id;
      inputHandler = onMessage;
    },

    closeInput() {
      openInputId = null;
      inputHandler = null;
    },

    openOutput(id) {
      if (!outputs.some((p) => p.id === id)) {
        throw new Error(`Unknown MIDI output: ${id}`);
      }
      openOutputId = id;
    },

    closeOutput() {
      openOutputId = null;
    },

    send(msg) {
      if (!openOutputId) return;
      sent.push(msg);
    },

    emitInput(msg) {
      if (!openInputId || !inputHandler) return;
      inputHandler(msg);
    },

    dispose() {
      openInputId = null;
      openOutputId = null;
      inputHandler = null;
      sent.length = 0;
    },
  };
}
