/**
 * Browser audio output device preference (setSinkId + localStorage).
 */

import { getMetronomeAudioContext } from "./metronome.js";

export const AUDIO_OUTPUT_STORAGE_KEY = "stagesync.audio.outputDeviceId";

type SinkableContext = AudioContext & {
  setSinkId?: (deviceId: string) => Promise<void>;
  sinkId?: string;
};

export function getStoredAudioOutputDeviceId(): string | null {
  try {
    const v = localStorage.getItem(AUDIO_OUTPUT_STORAGE_KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function setStoredAudioOutputDeviceId(deviceId: string | null): void {
  try {
    if (!deviceId) localStorage.removeItem(AUDIO_OUTPUT_STORAGE_KEY);
    else localStorage.setItem(AUDIO_OUTPUT_STORAGE_KEY, deviceId);
  } catch {
    /* private mode */
  }
}

export async function listAudioOutputDevices(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === "audiooutput");
}

export async function applyAudioOutputSink(
  deviceId: string | null,
  ctx: AudioContext = getMetronomeAudioContext(),
): Promise<void> {
  const sinkable = ctx as SinkableContext;
  if (typeof sinkable.setSinkId !== "function") {
    throw new Error("setSinkId niedostępne w tej przeglądarce");
  }
  await sinkable.setSinkId(deviceId ?? "");
}

/** Apply stored sink after creating / unlocking the shared AudioContext. */
export async function restoreAudioOutputSink(
  ctx: AudioContext = getMetronomeAudioContext(),
): Promise<void> {
  const id = getStoredAudioOutputDeviceId();
  if (!id) return;
  try {
    await applyAudioOutputSink(id, ctx);
  } catch {
    /* device may be gone — keep stored id for Preferences UI */
  }
}
