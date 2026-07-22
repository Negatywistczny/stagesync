/**
 * Injectable MIDI I/O backend (apps/server only — never Tauri).
 */

export type MidiDirection = "input" | "output";

export type MidiPortInfo = {
  id: string;
  name: string;
  direction: MidiDirection;
};

export type MidiRealtimeMessage =
  | { type: "clock" }
  | { type: "start" }
  | { type: "stop" }
  | { type: "continue" }
  | { type: "spp"; value: number }
  | { type: "program"; channel: number; program: number }
  | {
      type: "cc";
      channel: number;
      controller: number;
      value: number;
    };

export type MidiBackendKind = "native" | "mock" | "none";

export type MidiBackend = {
  readonly kind: MidiBackendKind;
  listInputs(): MidiPortInfo[];
  listOutputs(): MidiPortInfo[];
  openInput(id: string, onMessage: (msg: MidiRealtimeMessage) => void): void;
  closeInput(): void;
  openOutput(id: string): void;
  closeOutput(): void;
  send(msg: MidiRealtimeMessage): void;
  dispose(): void;
};
