import {
  gainDbToLinear,
  resolveChannelMode,
  ticksToMsAlongTempoMap,
  type Project,
} from "@stagesync/shared";
import { getMetronomeAudioContext } from "../metronome.js";
import { cacheKey, loadAudioBuffer } from "./buffer-cache.js";
import { releaseCueSample } from "./graph-nodes.js";
import {
  ensureGroupBus,
  ensureHwOutBus,
  ensureMasterBus,
} from "./graph-routing.js";
import { state } from "./state.js";
import type { ActiveCueSample } from "./types.js";

/** PANIC — stop all cue samples including playPostStop. */
export function panicCueSamples(): void {
  for (const a of state.activeCues) releaseCueSample(a);
  state.activeCues = [];
  state.firedCueIds.clear();
}

export function stopCueSamplesOnTransportStop(): void {
  const keep: ActiveCueSample[] = [];
  for (const a of state.activeCues) {
    if (a.playPostStop) keep.push(a);
    else releaseCueSample(a);
  }
  state.activeCues = keep;
}

function startCueSample(
  projectId: string,
  project: Project,
  clip: Project["cue"]["clips"][number],
  ctx: AudioContext,
): void {
  const sample = clip.sample;
  if (!sample) return;
  const buf = state.bufferCache.get(cacheKey(projectId, sample.assetId));
  if (!buf) {
    void loadAudioBuffer(projectId, sample.assetId, ctx);
    return;
  }
  const poly = sample.polyphony ?? "retrigger";
  if (poly === "choke") {
    state.activeCues = state.activeCues.filter((a) => {
      if (a.clipId !== clip.id) return true;
      releaseCueSample(a);
      return false;
    });
  }
  const source = ctx.createBufferSource();
  source.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.value = gainDbToLinear(sample.gainDb);
  const pan = ctx.createStereoPanner();
  pan.pan.value = sample.pan ?? 0;
  source.connect(gain);
  gain.connect(pan);

  const master = ensureMasterBus(ctx, project);
  let dest: AudioNode = master.gain;
  if (sample.output?.kind === "bus") {
    const busId = sample.output.busId;
    const bus = project.audioBusses?.find((b) => b.id === busId);
    if (bus) {
      dest = ensureGroupBus(
        ctx,
        project,
        bus.id,
        resolveChannelMode(bus.channelMode),
      ).gain;
    }
  } else if (sample.output?.kind === "hw_out") {
    const hwOutputId = sample.output.hwOutputId;
    const row = (project.audioHardwareOutputs ?? []).find(
      (h) => h.id === hwOutputId,
    );
    if (row) {
      const hw = ensureHwOutBus(ctx, project, row);
      if (hw) dest = hw.gain;
    }
  }
  pan.connect(dest);

  const mode = sample.mode ?? "one-shot";
  let dur = buf.duration;
  if (mode === "gated") {
    const alongMs = ticksToMsAlongTempoMap(
      clip.startTicks,
      clip.startTicks + clip.lengthTicks,
      project,
    );
    dur = Math.max(0.01, alongMs / 1000);
  }
  try {
    if (mode === "gated") source.start(0, 0, dur);
    else source.start(0);
  } catch {
    return;
  }
  const entry: ActiveCueSample = {
    clipId: clip.id,
    source,
    gain,
    pan,
    playPostStop: Boolean(sample.playPostStop),
  };
  source.onended = () => {
    state.activeCues = state.activeCues.filter((a) => a !== entry);
  };
  state.activeCues.push(entry);
}

/** Manual GO pad — fires cue sample (immediate or next-beat). */
export function fireCueSampleGo(
  projectId: string,
  project: Project,
  clipId: string,
  displayTicks: number,
  ctx: AudioContext = getMetronomeAudioContext(),
): boolean {
  const clip = project.cue.clips.find((c) => c.id === clipId);
  if (!clip?.sample) return false;
  const q = clip.sample.quantization ?? "immediate";
  if (q === "next-beat") {
    const beatTicks = Math.max(1, project.ppq);
    const next = Math.ceil((displayTicks + 1) / beatTicks) * beatTicks;
    const delayMs = Math.max(
      0,
      ticksToMsAlongTempoMap(displayTicks, next, project),
    );
    window.setTimeout(() => {
      startCueSample(projectId, project, clip, ctx);
    }, delayMs);
    return true;
  }
  startCueSample(projectId, project, clip, ctx);
  return true;
}

export function syncCueSamples(
  projectId: string,
  project: Project,
  displayTicks: number,
  prevTicks: number | null,
  ctx: AudioContext,
): void {
  for (const clip of project.cue.clips) {
    if (!clip.sample) continue;
    const q = clip.sample.quantization ?? "tick";
    if (q === "immediate") continue;

    let fireAt = clip.startTicks;
    if (q === "next-beat") {
      const beatTicks = Math.max(1, project.ppq);
      fireAt = Math.ceil(clip.startTicks / beatTicks) * beatTicks;
      if (fireAt < clip.startTicks) fireAt += beatTicks;
    }

    const crossed =
      prevTicks != null && prevTicks < fireAt && displayTicks >= fireAt;
    if (!crossed) continue;
    if (state.firedCueIds.has(clip.id)) continue;
    state.firedCueIds.add(clip.id);
    startCueSample(projectId, project, clip, ctx);
  }
}
