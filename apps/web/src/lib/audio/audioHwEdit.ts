/**
 * CRUD for project.audioHardwareOutputs (logical HW patches / HwOutputPatch).
 */

import {
  MAX_AUDIO_HARDWARE_OUTPUTS,
  hardwarePatchChannelWidth,
  masterOutputOverlapsHwPatches,
  resolveChannelMode,
  resolveMasterOutputRouting,
  type AudioHardwareOutput,
  type ChannelMode,
  type HwOutputPatch,
  type MasterOutputRouting,
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

export function hardwareOutputChannelWidth(mode: ChannelMode): number {
  return hardwarePatchChannelWidth(mode);
}

/**
 * Physical channels already spoken for: Master map + each HW patch.
 */
export function allocatedPhysicalChannelCount(
  existing: readonly HwOutputPatch[],
  masterOutput?: MasterOutputRouting | null,
): number {
  const master = resolveMasterOutputRouting(masterOutput);
  let n = hardwarePatchChannelWidth(master.channelMode);
  for (const row of existing) {
    n += hardwarePatchChannelWidth(resolveChannelMode(row.channelMode));
  }
  return n;
}

function occupiedChannelSet(
  existing: readonly HwOutputPatch[],
  masterOutput?: MasterOutputRouting | null,
): Set<number> {
  const occupied = new Set<number>();
  const master = resolveMasterOutputRouting(masterOutput);
  const mWidth = hardwarePatchChannelWidth(master.channelMode);
  for (let i = 0; i < mWidth; i++) occupied.add(master.channelOffset + i);
  for (const row of existing) {
    const width = hardwarePatchChannelWidth(
      resolveChannelMode(row.channelMode),
    );
    for (let i = 0; i < width; i++) occupied.add(row.channelOffset + i);
  }
  return occupied;
}

/**
 * Next free device offset for a new HW patch (avoids Master + existing patches).
 * Prefers even starts for stereo. Returns `-1` when none fit below an optional cap.
 */
export function nextHardwareChannelOffset(
  existing: readonly AudioHardwareOutput[],
  mode: ChannelMode = "stereo",
  masterOutput?: MasterOutputRouting | null,
  maxChannelCount?: number,
): number {
  const width = hardwarePatchChannelWidth(mode);
  const occupied = occupiedChannelSet(existing, masterOutput);
  const cap =
    maxChannelCount != null && Number.isFinite(maxChannelCount)
      ? Math.floor(maxChannelCount)
      : 64;
  for (let start = 0; start + width <= cap; start++) {
    if (mode === "stereo" && start % 2 === 1) continue;
    let free = true;
    for (let i = 0; i < width; i++) {
      if (occupied.has(start + i)) {
        free = false;
        break;
      }
    }
    if (free) return start;
  }
  return -1;
}

/**
 * Whether another HW patch fits on the device (`maxChannelCount` from
 * AudioContext.destination). Respects Master physical map.
 */
export function canAddHardwareOutput(
  existing: readonly AudioHardwareOutput[],
  maxChannelCount: number,
  mode: ChannelMode = "stereo",
  masterOutput?: MasterOutputRouting | null,
): boolean {
  if (!Number.isFinite(maxChannelCount) || maxChannelCount < 4) return false;
  if (existing.length >= MAX_AUDIO_HARDWARE_OUTPUTS) return false;
  return (
    nextHardwareChannelOffset(existing, mode, masterOutput, maxChannelCount) >=
    0
  );
}

export function addAudioHardwareOutput(
  project: Project,
  partial?: Partial<
    Pick<AudioHardwareOutput, "name" | "channelOffset" | "channelMode">
  >,
  opts?: { maxChannelCount?: number },
): { project: Project; hwOutputId: string } {
  const rows = project.audioHardwareOutputs ?? [];
  if (rows.length >= MAX_AUDIO_HARDWARE_OUTPUTS) {
    throw new RangeError(
      `Hardware outputs limited to ${MAX_AUDIO_HARDWARE_OUTPUTS}`,
    );
  }
  const mode = partial?.channelMode === "mono" ? "mono" : "stereo";
  if (
    opts?.maxChannelCount != null &&
    !canAddHardwareOutput(
      rows,
      opts.maxChannelCount,
      mode,
      project.masterOutput,
    )
  ) {
    throw new RangeError(
      `No free hardware channels (max ${opts.maxChannelCount})`,
    );
  }
  const hwOutputId = crypto.randomUUID();
  const name = partial?.name?.trim() || nextHardwareOutputName(rows);
  const channelOffset =
    partial?.channelOffset ??
    nextHardwareChannelOffset(
      rows,
      mode,
      project.masterOutput,
      opts?.maxChannelCount,
    );
  if (channelOffset < 0) {
    throw new RangeError("No free hardware channels");
  }
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
      if (patch.name != null)
        next.name = patch.name.trim().slice(0, 80) || r.name;
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

/** Set / clear Master physical device map (omit offset 0 stereo = default). */
export function setMasterOutputRouting(
  project: Project,
  routing: MasterOutputRouting | null,
): Project {
  if (routing == null) {
    if (project.masterOutput == null) return project;
    const { masterOutput: _drop, ...rest } = project;
    void _drop;
    return rest;
  }
  const resolved = resolveMasterOutputRouting(routing);
  const next: MasterOutputRouting = {};
  if (resolved.channelOffset !== 0) {
    next.channelOffset = resolved.channelOffset;
  }
  if (resolved.channelMode === "mono") {
    next.channelMode = "mono";
  }
  const candidate = Object.keys(next).length === 0 ? null : next;
  if (
    masterOutputOverlapsHwPatches(candidate, project.audioHardwareOutputs ?? [])
  ) {
    throw new RangeError(
      "Master output channels overlap a hardware output patch",
    );
  }
  if (candidate == null) {
    if (project.masterOutput == null) return project;
    const { masterOutput: _drop, ...rest } = project;
    void _drop;
    return rest;
  }
  return { ...project, masterOutput: candidate };
}
