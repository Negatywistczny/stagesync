/**
 * CRUD for project.audioHardwareOutputs (logical HW patches).
 */

import {
  MAX_AUDIO_HARDWARE_OUTPUTS,
  type AudioHardwareOutput,
  type ChannelMode,
  type Project,
} from "@stagesync/shared";

export function nextHardwareOutputName(
  existing: readonly { name: string }[],
): string {
  let max = 0;
  for (const row of existing) {
    const m = /^HW\s+(\d+)$/i.exec(row.name.trim());
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `HW ${max + 1}`;
}

/** Next free stereo pair offset (≥ 2; Master uses 0–1). */
export function nextHardwareChannelOffset(
  existing: readonly AudioHardwareOutput[],
  mode: ChannelMode = "stereo",
): number {
  let maxEnd = 1; // Master occupies 0–1
  for (const row of existing) {
    const width = row.channelMode === "mono" ? 1 : 2;
    maxEnd = Math.max(maxEnd, row.channelOffset + width - 1);
  }
  const start = maxEnd + 1;
  // Prefer even offsets for stereo pairs
  if (mode === "stereo" && start % 2 === 1) return start + 1;
  return start;
}

export function addAudioHardwareOutput(
  project: Project,
  partial?: Partial<
    Pick<AudioHardwareOutput, "name" | "channelOffset" | "channelMode">
  >,
): { project: Project; hwOutputId: string } {
  const rows = project.audioHardwareOutputs ?? [];
  if (rows.length >= MAX_AUDIO_HARDWARE_OUTPUTS) {
    throw new RangeError(
      `Hardware outputs limited to ${MAX_AUDIO_HARDWARE_OUTPUTS}`,
    );
  }
  const mode = partial?.channelMode === "mono" ? "mono" : "stereo";
  const hwOutputId = crypto.randomUUID();
  const name =
    partial?.name?.trim() || nextHardwareOutputName(rows);
  const channelOffset =
    partial?.channelOffset ?? nextHardwareChannelOffset(rows, mode);
  const row: AudioHardwareOutput = {
    id: hwOutputId,
    name: name.slice(0, 80),
    channelOffset,
    channelMode: mode,
  };
  return {
    project: {
      ...project,
      audioHardwareOutputs: [...rows, row],
    },
    hwOutputId,
  };
}

export function updateAudioHardwareOutput(
  project: Project,
  hwOutputId: string,
  patch: Partial<
    Pick<
      AudioHardwareOutput,
      "name" | "channelOffset" | "channelMode" | "gainDb" | "muted"
    >
  >,
): Project {
  const rows = project.audioHardwareOutputs ?? [];
  if (!rows.some((r) => r.id === hwOutputId)) return project;
  return {
    ...project,
    audioHardwareOutputs: rows.map((r) => {
      if (r.id !== hwOutputId) return r;
      const next = { ...r };
      if (patch.name != null) next.name = patch.name.trim().slice(0, 80) || r.name;
      if (patch.channelOffset != null) {
        next.channelOffset = Math.max(
          0,
          Math.min(62, Math.floor(patch.channelOffset)),
        );
      }
      if (patch.channelMode != null) next.channelMode = patch.channelMode;
      if (patch.gainDb != null) next.gainDb = patch.gainDb;
      if (patch.muted != null) next.muted = patch.muted;
      return next;
    }),
  };
}

export function removeAudioHardwareOutput(
  project: Project,
  hwOutputId: string,
): Project {
  const rows = project.audioHardwareOutputs ?? [];
  if (!rows.some((r) => r.id === hwOutputId)) return project;
  const audioTracks = project.audioTracks.map((t) => {
    if (t.output?.kind === "hw_out" && t.output.hwOutputId === hwOutputId) {
      const { output: _drop, ...rest } = t;
      void _drop;
      return rest;
    }
    return t;
  });
  const audioBusses = (project.audioBusses ?? []).map((b) => {
    if (b.output?.kind === "hw_out" && b.output.hwOutputId === hwOutputId) {
      const { output: _drop, ...rest } = b;
      void _drop;
      return rest;
    }
    return b;
  });
  const cueClips = project.cue.clips.map((c) => {
    if (
      c.sample?.output?.kind === "hw_out" &&
      c.sample.output.hwOutputId === hwOutputId
    ) {
      const { output: _drop, ...sampleRest } = c.sample;
      void _drop;
      return { ...c, sample: sampleRest };
    }
    return c;
  });
  return {
    ...project,
    audioTracks,
    audioBusses,
    cue: { ...project.cue, clips: cueClips },
    audioHardwareOutputs: rows.filter((r) => r.id !== hwOutputId),
  };
}
