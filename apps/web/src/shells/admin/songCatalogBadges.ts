import {
  formatKeySignature,
  formatSetDurationMs,
  resolveKeyAt,
  resolveTempoAt,
  ticksToMsAlongTempoMap,
  projectEndTicks,
  type LibraryProjectEntry,
  type Project,
} from "@stagesync/shared";

/** Dense list-tile badges from denormalized catalog fields. */
export function catalogSongBadges(entry: LibraryProjectEntry): string[] {
  const badges: string[] = [];
  if (entry.defaultBpm != null && Number.isFinite(entry.defaultBpm)) {
    badges.push(`${Math.round(entry.defaultBpm)}`);
  }
  if (entry.keyLabel?.trim()) {
    badges.push(entry.keyLabel.trim());
  }
  if (entry.durationMs != null && entry.durationMs > 0) {
    badges.push(formatSetDurationMs(entry.durationMs));
  }
  return badges;
}

export type SongInspectorMeta = {
  bpm: number | null;
  keyLabel: string | null;
  durationLabel: string | null;
};

/** Inspector meta from full project (Key / BPM / duration). No project-level note field. */
export function songInspectorMeta(project: Project): SongInspectorMeta {
  const bpm = resolveTempoAt(project, 0);
  const key = resolveKeyAt(project, 0);
  const keyLabel = key ? formatKeySignature(key) : null;
  let durationLabel: string | null = null;
  try {
    const ms = ticksToMsAlongTempoMap(0, projectEndTicks(project), project);
    if (Number.isFinite(ms) && ms > 0) {
      durationLabel = formatSetDurationMs(ms);
    }
  } catch {
    durationLabel = null;
  }
  return {
    bpm: Number.isFinite(bpm) ? bpm : null,
    keyLabel: keyLabel && keyLabel !== "—" ? keyLabel : null,
    durationLabel,
  };
}
