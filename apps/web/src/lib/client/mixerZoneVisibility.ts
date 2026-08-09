/**
 * Mixer zone visibility (Audio / Busy / HW Out / Master rail) — localStorage session prefs.
 */

export const MIXER_ZONE_VISIBILITY_KEY = "stagesync-mixer-zone-visibility";

export type MixerZoneId = "audio" | "bus" | "hw" | "master";

export type MixerZoneVisibility = Record<MixerZoneId, boolean>;

export const DEFAULT_MIXER_ZONE_VISIBILITY: MixerZoneVisibility = {
  audio: true,
  bus: true,
  hw: true,
  master: true,
};

const ZONE_IDS: readonly MixerZoneId[] = ["audio", "bus", "hw", "master"];

function isMixerZoneId(value: string): value is MixerZoneId {
  return (ZONE_IDS as readonly string[]).includes(value);
}

export function defaultMixerZoneVisibility(): MixerZoneVisibility {
  return { ...DEFAULT_MIXER_ZONE_VISIBILITY };
}

export function loadMixerZoneVisibility(
  storage: Pick<Storage, "getItem"> | null = typeof localStorage !== "undefined"
    ? localStorage
    : null,
): MixerZoneVisibility {
  const fallback = defaultMixerZoneVisibility();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(MIXER_ZONE_VISIBILITY_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Record<string, unknown>>;
    const next = { ...fallback };
    for (const id of ZONE_IDS) {
      if (typeof parsed[id] === "boolean") next[id] = parsed[id];
    }
    return next;
  } catch {
    return fallback;
  }
}

export function saveMixerZoneVisibility(
  prefs: MixerZoneVisibility,
  storage: Pick<Storage, "setItem"> | null = typeof localStorage !== "undefined"
    ? localStorage
    : null,
): void {
  if (!storage) return;
  try {
    const payload: MixerZoneVisibility = { ...DEFAULT_MIXER_ZONE_VISIBILITY };
    for (const id of ZONE_IDS) {
      payload[id] = Boolean(prefs[id]);
    }
    storage.setItem(MIXER_ZONE_VISIBILITY_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

export function toggleMixerZoneVisibility(
  prefs: MixerZoneVisibility,
  zoneId: MixerZoneId,
): MixerZoneVisibility {
  if (!isMixerZoneId(zoneId)) return prefs;
  return { ...prefs, [zoneId]: !prefs[zoneId] };
}
