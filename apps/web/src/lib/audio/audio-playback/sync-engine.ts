import {
  audioClipBufferOffsetSecAlongMaps,
  audioClipPlayableMs,
  audioClipRemainingSecAlongMaps,
  audioFadeGainAtMs,
  fadeInMsOf,
  fadeOutMsOf,
  gainDbToLinear,
  projectEndTicks,
  resolveChannelMode,
  resolveMasterOutputRouting,
  resolveMeterAt,
  resolveTempoAt,
  resolveTrackOutputDest,
  STEREO_DOWNMIX_LINEAR,
  trimInMsOf,
  trimOutMsOf,
  type ChannelMode,
  type Project,
} from "@stagesync/shared";
import {
  getMetronomeAudioContext,
  resumeMetronomeAudio,
} from "../metronome.js";
import { cacheKey, loadAudioBuffer } from "./buffer-cache.js";
import {
  panicCueSamples,
  stopCueSamplesOnTransportStop,
  syncCueSamples,
} from "./cue-samples.js";
import { releaseActiveSource } from "./graph-nodes.js";
import {
  applyBusParams,
  disposeBuses,
  ensureTrackBus,
} from "./graph-routing.js";
import { SEEK_JUMP_TICKS, state } from "./state.js";
import type { ActiveSource, AudioPlaybackInput } from "./types.js";

function stopAll(): void {
  for (const a of state.active) {
    releaseActiveSource(a);
  }
  state.active = [];
  stopCueSamplesOnTransportStop();
  state.firedCueIds.clear();
}

/** Immediate local mute (Pause/Stop click) — blocks re-schedule until cleared. */
export function suppressAudioPlayback(): void {
  state.playbackSuppressed = true;
  state.stopEpoch += 1;
  stopAll();
  panicCueSamples();
  state.lastDisplayTicks = null;
  state.lastGraphKey = "";
}

/** Re-arm scheduler after an explicit Play gesture. */
export function allowAudioPlayback(): void {
  state.playbackSuppressed = false;
}

/** Test/debug: active BufferSource count + suppress flag. */
export function getAudioPlaybackDebugState(): {
  activeCount: number;
  /** Active cue-sample voices (one-shot / gated). */
  activeCueCount: number;
  suppressed: boolean;
  stopEpoch: number;
  /** Linear gain currently applied to each group bus (post mute/solo). */
  groupBusGainLinear: Record<string, number>;
  /** Linear gain currently applied to each track bus fader. */
  trackGainLinear: Record<string, number>;
} {
  const groupBusGainLinear: Record<string, number> = {};
  for (const [id, bus] of state.groupBuses) {
    groupBusGainLinear[id] = bus.gain.gain.value;
  }
  const trackGainLinear: Record<string, number> = {};
  for (const [id, bus] of state.trackBuses) {
    trackGainLinear[id] = bus.gain.gain.value;
  }
  return {
    activeCount: state.active.length,
    activeCueCount: state.activeCues.length,
    suppressed: state.playbackSuppressed,
    stopEpoch: state.stopEpoch,
    groupBusGainLinear,
    trackGainLinear,
  };
}

/**
 * Structural graph key — mute/solo/clip geometry / track routing / channel mode.
 * Track/bus/master gain/pan and clip `gainDb` update live (no restart).
 *
 * Idle group-bus rows are intentionally omitted: add/remove/mute/gain/pan on a
 * bus is handled by {@link applyBusParams}. Listing every bus here used to
 * rebuild all clip voices on "+ Dodaj Bus" even with zero sends — and any
 * incomplete voice teardown then stacked levelGain→track edges (loudness creep).
 */
function graphKey(input: AudioPlaybackInput): string {
  return [
    input.project.audioClips
      .map(
        (c) =>
          `${c.id}:${c.trackId}:${c.assetId}:${c.startTicks}:${c.lengthTicks}:${c.trimInMs ?? 0}:${c.trimOutMs ?? 0}:${c.muted}:${c.fadeInMs ?? 0}:${c.fadeOutMs ?? 0}:${c.loop ?? false}`,
      )
      .join(";"),
    input.project.audioTracks
      .map((t) => {
        const out =
          t.output?.kind === "bus"
            ? `bus:${t.output.busId}`
            : t.output?.kind === "hw_out"
              ? `hw:${t.output.hwOutputId}`
              : "master";
        return `${t.id}:${t.muted}:${resolveChannelMode(t.channelMode)}:${out}`;
      })
      .join(";"),
    (input.soloTrackIds ?? []).join(","),
    (input.soloBusIds ?? []).join(","),
    (() => {
      const m = resolveMasterOutputRouting(input.project.masterOutput);
      return `masterOut:${m.channelOffset}:${m.channelMode}`;
    })(),
    (input.project.audioHardwareOutputs ?? [])
      .map(
        (h) =>
          `${h.id}:${h.channelOffset}:${resolveChannelMode(h.channelMode)}`,
      )
      .join(";"),
    input.project.cue.clips
      .map((c) => {
        const s = c.sample;
        if (!s) return `${c.id}:-`;
        return `${c.id}:${s.assetId}:${s.mode ?? "one-shot"}:${s.quantization ?? "tick"}:${s.output?.kind === "bus" ? s.output.busId : "master"}`;
      })
      .join(";"),
  ].join("|");
}

function isClipAudible(
  track: Project["audioTracks"][number] | undefined,
  clipMuted: boolean | undefined,
  soloTrackIds: readonly string[] | undefined,
  soloBusIds: readonly string[] | undefined,
  busIds: ReadonlySet<string>,
): boolean {
  if (clipMuted) return false;
  if (track?.muted) return false;
  // Track solo wins over bus solo (same rule as busSoloMutesBus / DEF-BUG-04).
  if (soloTrackIds && soloTrackIds.length > 0) {
    return track != null && soloTrackIds.includes(track.id);
  }
  if (soloBusIds && soloBusIds.length > 0) {
    if (!track) return false;
    const dest = resolveTrackOutputDest(track.output, busIds);
    return dest.kind === "bus" && soloBusIds.includes(dest.busId);
  }
  return true;
}

/**
 * Stereo file on mono track: L+R each × −3 dB into clip gain.
 * Returns extra nodes to disconnect on stop.
 */
function connectWithOptionalDownmix(
  ctx: AudioContext,
  source: AudioBufferSourceNode,
  clipGain: GainNode,
  trackMode: ChannelMode,
  bufferChannels: number,
): AudioNode[] {
  if (trackMode === "mono" && bufferChannels >= 2) {
    const splitter = ctx.createChannelSplitter(2);
    const gL = ctx.createGain();
    const gR = ctx.createGain();
    gL.gain.value = STEREO_DOWNMIX_LINEAR;
    gR.gain.value = STEREO_DOWNMIX_LINEAR;
    source.connect(splitter);
    splitter.connect(gL, 0);
    splitter.connect(gR, 1);
    gL.connect(clipGain);
    gR.connect(clipGain);
    return [splitter, gL, gR];
  }
  // Mono→stereo: browser upmix into True Balance path; stereo→stereo direct.
  source.connect(clipGain);
  return [];
}

function startClip(
  projectId: string,
  project: Project,
  clipId: string,
  displayTicks: number,
  ctx: AudioContext,
  soloTrackIds?: readonly string[],
  soloBusIds?: readonly string[],
): void {
  const clip = project.audioClips.find((c) => c.id === clipId);
  if (!clip) return;
  const track = project.audioTracks.find((t) => t.id === clip.trackId);
  const busIds = new Set((project.audioBusses ?? []).map((b) => b.id));
  if (!isClipAudible(track, clip.muted, soloTrackIds, soloBusIds, busIds)) {
    return;
  }

  const ctxTempo = {
    bpm: resolveTempoAt(project, clip.startTicks),
    meter: resolveMeterAt(project, clip.startTicks),
    ppq: project.ppq,
  };
  const offset = audioClipBufferOffsetSecAlongMaps(clip, displayTicks, project);
  if (offset == null) return;

  const buf = state.bufferCache.get(cacheKey(projectId, clip.assetId));
  if (!buf) {
    const epoch = state.stopEpoch;
    void loadAudioBuffer(projectId, clip.assetId, ctx).then((loaded) => {
      if (!loaded || epoch !== state.stopEpoch || state.playbackSuppressed)
        return;
      const snap = state.lastSyncArgs;
      if (!snap || snap.projectId !== projectId || !snap.input.playing) return;
      if (!snap.input.project.audioClips.some((c) => c.id === clipId)) return;
      if (state.active.some((a) => a.clipId === clipId)) return;
      startClip(
        projectId,
        snap.input.project,
        clipId,
        snap.input.displayTicks,
        snap.ctx,
        snap.input.soloTrackIds,
        snap.input.soloBusIds,
      );
    });
    return;
  }

  const remaining = audioClipRemainingSecAlongMaps(
    clip,
    project.assets.find((a) => a.id === clip.assetId),
    displayTicks,
    project,
    ctxTempo,
  );
  if (remaining <= 0.005) return;

  const source = ctx.createBufferSource();
  source.buffer = buf;
  if (clip.loop) {
    const loopStart = trimInMsOf(clip) / 1000;
    const loopEnd = Math.max(
      loopStart,
      buf.duration - trimOutMsOf(clip) / 1000,
    );
    // Zero-length loop window can hang some engines — skip loop in that case.
    if (loopEnd > loopStart + 1e-4) {
      source.loop = true;
      source.loopStart = loopStart;
      source.loopEnd = loopEnd;
    }
  }

  // Fade envelope (0…1) separate from clip level so gainDb can update live.
  const intoClipMs = Math.max(0, offset * 1000 - trimInMsOf(clip));
  const asset = project.assets.find((a) => a.id === clip.assetId);
  const playableMs = audioClipPlayableMs(clip, asset, ctxTempo);
  const fadeIn = fadeInMsOf(clip);
  const fadeOut = fadeOutMsOf(clip);
  const now = ctx.currentTime;

  const fadeGain = ctx.createGain();
  const startFade = audioFadeGainAtMs(intoClipMs, playableMs, fadeIn, fadeOut);
  fadeGain.gain.cancelScheduledValues(now);
  fadeGain.gain.setValueAtTime(startFade, now);

  if (fadeIn > 0 && intoClipMs < fadeIn) {
    const reachMaxAt = now + (fadeIn - intoClipMs) / 1000;
    if (reachMaxAt > now) {
      fadeGain.gain.linearRampToValueAtTime(1, reachMaxAt);
    }
  }

  if (fadeOut > 0 && playableMs > 0) {
    const fadeOutStartMs = playableMs - fadeOut;
    const fadeOutStartAt = now + (fadeOutStartMs - intoClipMs) / 1000;
    const endAt = now + (playableMs - intoClipMs) / 1000;
    if (fadeOutStartAt > now) {
      fadeGain.gain.setValueAtTime(1, fadeOutStartAt);
      if (endAt > fadeOutStartAt) {
        fadeGain.gain.linearRampToValueAtTime(0, endAt);
      }
    } else if (endAt > now) {
      // Already in fade-out: startFade is the anchor (setValueAtTime above).
      fadeGain.gain.linearRampToValueAtTime(0, endAt);
    }
  }

  const levelGain = ctx.createGain();
  levelGain.gain.value = gainDbToLinear(clip.gainDb);

  const trackMode = resolveChannelMode(track?.channelMode);
  const trackBus = ensureTrackBus(ctx, project, clip.trackId, trackMode);
  const extras = connectWithOptionalDownmix(
    ctx,
    source,
    fadeGain,
    trackMode,
    buf.numberOfChannels,
  );
  fadeGain.connect(levelGain);
  levelGain.connect(trackBus.gain);
  const startAt = Math.max(
    0,
    Math.min(offset, Math.max(0, buf.duration - 0.001)),
  );
  try {
    source.start(ctx.currentTime, startAt, remaining);
  } catch {
    return;
  }
  const entry: ActiveSource = {
    clipId,
    trackId: clip.trackId,
    source,
    fadeGain,
    levelGain,
    extras,
  };
  // Match by entry identity — NOT clipId. After stop()/seek, the old source's
  // `ended` event must not remove a newly started voice for the same clip.
  source.onended = () => {
    state.active = state.active.filter((a) => a !== entry);
  };
  state.active.push(entry);
}

/**
 * Soft-stop when SSOT ticks are already past song end while the server is
 * still `playing` (pause-at-end / auto-advance awaiting setlist I/O).
 * Stops WebAudio sources only — does not invent a music clock (ADR 0002).
 */
export function shouldSoftStopPastSongEnd(input: AudioPlaybackInput): boolean {
  if (input.loopEnabled) return false;
  return input.displayTicks >= projectEndTicks(input.project);
}

export function syncAudioPlayback(
  projectId: string,
  input: AudioPlaybackInput,
  ctx: AudioContext = getMetronomeAudioContext(),
): void {
  state.lastSyncArgs = { projectId, input, ctx };
  applyBusParams(input.project, ctx, input.soloTrackIds, input.soloBusIds);

  if (
    state.playbackSuppressed ||
    !input.playing ||
    shouldSoftStopPastSongEnd(input) ||
    ctx.state !== "running"
  ) {
    stopAll();
    state.lastDisplayTicks = input.displayTicks;
    state.lastGraphKey = graphKey(input);
    return;
  }

  const gKey = graphKey(input);
  const jumped =
    state.lastDisplayTicks != null &&
    Math.abs(input.displayTicks - state.lastDisplayTicks) > SEEK_JUMP_TICKS;
  // Loop wrap: ticks jumped backward while looping — stop active sources so a
  // clip positioned at the exclusive loop end cannot ring across the wrap.
  const loopWrapped =
    input.loopEnabled &&
    state.lastDisplayTicks != null &&
    input.displayTicks < state.lastDisplayTicks;
  const graphChanged = gKey !== state.lastGraphKey;
  if (jumped || loopWrapped || graphChanged) {
    state.stopEpoch += 1;
    stopAll();
    state.firedCueIds.clear();
  }
  const epochAtStart = state.stopEpoch;

  const prevTicks = state.lastDisplayTicks;
  state.lastDisplayTicks = input.displayTicks;
  state.lastGraphKey = gKey;

  const trackById = new Map(input.project.audioTracks.map((t) => [t.id, t]));
  const busIds = new Set((input.project.audioBusses ?? []).map((b) => b.id));
  const stillNeeded = new Set<string>();
  const clipById = new Map(input.project.audioClips.map((c) => [c.id, c]));

  for (const clip of input.project.audioClips) {
    if (epochAtStart !== state.stopEpoch || state.playbackSuppressed) break;
    const track = trackById.get(clip.trackId);
    if (
      !isClipAudible(
        track,
        clip.muted,
        input.soloTrackIds,
        input.soloBusIds,
        busIds,
      )
    ) {
      continue;
    }
    const offset = audioClipBufferOffsetSecAlongMaps(
      clip,
      input.displayTicks,
      input.project,
    );
    if (offset == null) continue;
    stillNeeded.add(clip.id);
    if (state.active.some((a) => a.clipId === clip.id)) continue;
    startClip(
      projectId,
      input.project,
      clip.id,
      input.displayTicks,
      ctx,
      input.soloTrackIds,
      input.soloBusIds,
    );
  }

  syncCueSamples(projectId, input.project, input.displayTicks, prevTicks, ctx);

  // Live clip gainDb (not part of graphKey) — only write when changed.
  for (const a of state.active) {
    const clip = clipById.get(a.clipId);
    if (!clip) continue;
    const lin = gainDbToLinear(clip.gainDb);
    if (a.levelGain.gain.value !== lin) {
      a.levelGain.gain.value = lin;
    }
  }

  for (const a of [...state.active]) {
    if (!stillNeeded.has(a.clipId)) {
      releaseActiveSource(a);
      state.active = state.active.filter((x) => x !== a);
    }
  }
}

export function stopAudioPlayback(): void {
  state.stopEpoch += 1;
  stopAll();
  disposeBuses();
  state.lastDisplayTicks = null;
  state.lastGraphKey = "";
  state.lastSyncArgs = null;
}

export async function resumeAndSyncAudioPlayback(
  projectId: string,
  input: AudioPlaybackInput,
): Promise<void> {
  const epoch = state.stopEpoch;
  await resumeMetronomeAudio(getMetronomeAudioContext());
  // Pause/Stop during resume must not start sources from a stale Play snapshot.
  if (state.playbackSuppressed || epoch !== state.stopEpoch) return;
  if (!input.playing) return;
  syncAudioPlayback(projectId, input);
}

export function restartAudioPlayback(
  projectId: string,
  input: AudioPlaybackInput,
  ctx: AudioContext = getMetronomeAudioContext(),
): void {
  // Caller must `allowAudioPlayback()` before async resume/buffer; do not clear
  // suppress here — Pause during that window would otherwise phantom-start.
  if (state.playbackSuppressed) return;
  state.stopEpoch += 1;
  stopAll();
  state.lastDisplayTicks = null;
  state.lastGraphKey = "";
  syncAudioPlayback(projectId, input, ctx);
}
