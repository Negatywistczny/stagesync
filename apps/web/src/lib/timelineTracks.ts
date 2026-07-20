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

export type TrackId = CoreTrackId | `audio-${string}`;

export type TrackDef = {
  id: CoreTrackId;
  label: string;
  group: "special" | "content";
  /** Always visible — no eye toggle (Forma). */
  locked?: boolean;
};

/** v4 order: special lanes above content. */
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

export function defaultTrackVisibility(): Record<CoreTrackId, boolean> {
  const out = {} as Record<CoreTrackId, boolean>;
  for (const track of TRACKS) {
    out[track.id] = track.group === "content";
  }
  return out;
}

export function isCoreTrackVisible(
  visibility: Record<CoreTrackId, boolean>,
  id: CoreTrackId,
): boolean {
  const def = TRACKS.find((t) => t.id === id);
  if (def?.locked) return true;
  return visibility[id] ?? true;
}
