import { mergeApiHeaders } from "../operatorPin.js";
import { readApiError } from "./readApiError.js";

export type MidiPortInfo = {
  id: string;
  name: string;
  direction: "input" | "output";
};

export type MidiHostStatus = {
  available: boolean;
  backend: "native" | "mock" | "none";
  config: {
    inputId: string | null;
    outputId: string | null;
    clockOutEnabled: boolean;
    /** null = Omni; 0–15 = single channel (API 0-based). */
    inputChannel: number | null;
    /** 0–15 Program Change OUT (API 0-based). */
    outputChannel: number;
  };
  inputs: MidiPortInfo[];
  outputs: MidiPortInfo[];
  rates: {
    clockPerSec: number;
    sppPerSec: number;
    pcPerSec: number;
    beatToWsPerSec: number;
  };
  clockOutActive: boolean;
  lastError: string | null;
};

export async function fetchMidiHostStatus(): Promise<MidiHostStatus> {
  const res = await fetch("/api/midi", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as MidiHostStatus;
}

export async function putMidiHostConfig(body: {
  inputId?: string | null;
  outputId?: string | null;
  clockOutEnabled?: boolean;
  inputChannel?: number | null;
  outputChannel?: number;
}): Promise<MidiHostStatus> {
  const res = await fetch("/api/midi/config", {
    method: "PUT",
    headers: mergeApiHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as MidiHostStatus;
}

export type MidiPanicResult = {
  ok: true;
  sent: boolean;
  channels: number;
  status: MidiHostStatus;
};

/** Host MIDI Panic / MUTE ALL (All Notes Off + Reset Controllers). */
export async function postMidiPanic(): Promise<MidiPanicResult> {
  const res = await fetch("/api/midi/panic", {
    method: "POST",
    headers: { "content-type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as MidiPanicResult;
}
