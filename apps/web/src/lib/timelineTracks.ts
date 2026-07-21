/** Core timeline lane ids (fixed order — v4 parity). */
export type CoreTrackId =
  | "tempo"
  | "tonacja"
  | "metrum"
  | "kotwice"
  | "forma"
  | "tekst"
  | "akordy"
  | "cue";

/** Dynamic audio lane id: `audio:<trackUUID>`. */
export type AudioLaneId = `audio:${string}`;

export type TrackId = CoreTrackId | AudioLaneId;

export type TrackDef = {
  id: TrackId;
  label: string;
  group: "special" | "content" | "audio";
  /** Always visible — no eye toggle (Forma). */
  locked?: boolean;
  /** Set when group === "audio". */
  audioTrackId?: string;
};

/** v4 order: special lanes above content; audio lanes after Cue. */
export const TRACKS: TrackDef[] = [
  { id: "tempo", label: "Tempo", group: "special" },
  { id: "tonacja", label: "Tonacja", group: "special" },
  { id: "metrum", label: "Metrum", group: "special" },
  { id: "kotwice", label: "Kotwice", group: "special" },
  { id: "forma", label: "Forma", group: "content", locked: true },
  { id: "tekst", label: "Tekst", group: "content" },
  { id: "akordy", label: "Akordy", group: "content" },
  { id: "cue", label: "Cue", group: "content" },
];

export function audioLaneId(trackId: string): AudioLaneId {
  return `audio:${trackId}`;
}

export function isAudioLaneId(id: string): id is AudioLaneId {
  return id.startsWith("audio:");
}

export function audioTrackIdFromLane(lane: AudioLaneId): string {
  return lane.slice("audio:".length);
}

export type AudioTrackLike = { id: string; name: string };

/** Core TRACKS + one row per project audioTracks entry (0…N). */
export function buildTrackList(audioTracks: AudioTrackLike[] = []): TrackDef[] {
  const audioDefs: TrackDef[] = audioTracks.map((t, i) => ({
    id: audioLaneId(t.id),
    label: t.name?.trim() || `Audio ${i + 1}`,
    group: "audio" as const,
    audioTrackId: t.id,
  }));
  return [...TRACKS, ...audioDefs];
}

export type TrackVisibilityMap = Record<string, boolean>;

export function defaultTrackVisibility(
  audioTracks: AudioTrackLike[] = [],
): TrackVisibilityMap {
  const out: TrackVisibilityMap = {};
  for (const track of TRACKS) {
    out[track.id] = track.group === "content";
  }
  for (const t of audioTracks) {
    out[audioLaneId(t.id)] = true;
  }
  return out;
}

/** Merge new audio track ids into visibility (default visible). */
export function ensureAudioTrackVisibility(
  visibility: TrackVisibilityMap,
  audioTracks: AudioTrackLike[],
): TrackVisibilityMap {
  let changed = false;
  const next = { ...visibility };
  for (const t of audioTracks) {
    const id = audioLaneId(t.id);
    if (!(id in next)) {
      next[id] = true;
      changed = true;
    }
  }
  return changed ? next : visibility;
}

export function isTrackVisible(
  visibility: TrackVisibilityMap,
  track: TrackDef,
): boolean {
  if (track.locked) return true;
  return visibility[track.id] ?? true;
}

/** @deprecated Prefer isTrackVisible — kept for existing call sites. */
export function isCoreTrackVisible(
  visibility: TrackVisibilityMap,
  id: CoreTrackId,
): boolean {
  const def = TRACKS.find((t) => t.id === id);
  if (def?.locked) return true;
  return visibility[id] ?? true;
}
