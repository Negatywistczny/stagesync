import {
  readAppearance,
  type AppearanceState,
} from "@lib/client/appearance.js";
import { getStoredAudioOutputDeviceId } from "@lib/audio/audioOutputPrefs.js";
import { getStoredLatencyCompensationMs } from "@lib/audio/audioLatencyPrefs.js";
import {
  getStoredClockDisplayFormat,
  type ClockDisplayFormat,
} from "@lib/client/clockDisplayPrefs.js";
import {
  getMetronomePrefs,
  type MetronomePrefs,
} from "@lib/audio/metronomePrefs.js";
import { getStoredDeviceDisplayName } from "@lib/client/deviceNamePrefs.js";
import { type PreferencesTab } from "@lib/client/preferencesEvents.js";

export type MidiDraft = {
  inputId: string | null;
  outputId: string | null;
  clockOutEnabled: boolean;
  inputChannel: number | null;
  outputChannel: number;
};

export type PrefsSnapshot = {
  appearance: AppearanceState;
  clockFormat: ClockDisplayFormat;
  deviceName: string;
  sinkId: string;
  latencyCompMs: number;
  metro: MetronomePrefs;
  midi: MidiDraft | null;
};

export type SettingsTab = PreferencesTab | "server";

export const TABS: { id: SettingsTab; label: string }[] = [
  { id: "general", label: "Ogólne" },
  { id: "audio", label: "Audio" },
  { id: "midi", label: "MIDI" },
  { id: "metronome", label: "Metronom" },
  { id: "server", label: "Serwer" },
];

export function readLocalSnapshot(): PrefsSnapshot {
  const metro = getMetronomePrefs();
  return {
    appearance: readAppearance(),
    clockFormat: getStoredClockDisplayFormat(),
    deviceName: getStoredDeviceDisplayName() ?? "",
    sinkId: getStoredAudioOutputDeviceId() ?? "",
    latencyCompMs: getStoredLatencyCompensationMs(),
    metro,
    midi: null,
  };
}

export function midiDraftEqual(
  a: MidiDraft | null,
  b: MidiDraft | null,
): boolean {
  if (a == null || b == null) return a === b;
  return (
    a.inputId === b.inputId &&
    a.outputId === b.outputId &&
    a.clockOutEnabled === b.clockOutEnabled &&
    a.inputChannel === b.inputChannel &&
    a.outputChannel === b.outputChannel
  );
}

export function prefsEqual(a: PrefsSnapshot, b: PrefsSnapshot): boolean {
  return (
    a.appearance.profile === b.appearance.profile &&
    a.clockFormat === b.clockFormat &&
    a.deviceName === b.deviceName &&
    a.sinkId === b.sinkId &&
    a.latencyCompMs === b.latencyCompMs &&
    a.metro.accentVolume === b.metro.accentVolume &&
    a.metro.beatVolume === b.metro.beatVolume &&
    a.metro.timbre === b.metro.timbre &&
    a.metro.masterGainDb === b.metro.masterGainDb &&
    midiDraftEqual(a.midi, b.midi)
  );
}
