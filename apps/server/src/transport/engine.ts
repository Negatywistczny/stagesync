/**
 * In-memory transport SSOT: position from originMs + elapsed (never += on timer).
 * Loop wrap is server-authoritative (inclusive start / exclusive end).
 */

import {
  DEFAULT_PPQ,
  TRANSPORT_TICK_INTERVAL_MS,
  assertValidTimeSignature,
  defaultTransportState,
  elapsedToTicks,
  isUsableLoop,
  loopWrapTicks,
  normalizeLoop,
  resolveMeterAt,
  resolveTempoAt,
  transportHomeTicks,
  type Project,
  type TimeSignature,
  type TransportLoop,
  type TransportLoopBody,
  type TransportPlayBody,
  type TransportState,
  type TransportTickMessage,
} from "@stagesync/shared";

export type TransportEngineOptions = {
  /** Injectable clock for tests (defaults to performance.now). */
  now?: () => number;
  tickIntervalMs?: number;
};

type Listener = (msg: TransportTickMessage) => void;

/**
 * In-memory transport SSOT: position from originMs + elapsed (never += on timer).
 */
export function createTransportEngine(options: TransportEngineOptions = {}) {
  const now = options.now ?? (() => performance.now());
  const tickIntervalMs = options.tickIntervalMs ?? TRANSPORT_TICK_INTERVAL_MS;

  let playing = false;
  let positionTicks = 0;
  let bpm = defaultTransportState().bpm;
  let timeSignature: TimeSignature = {
    ...defaultTransportState().timeSignature,
  };
  let activeProjectId: string | null = null;
  /** Bound project for mid-play tempo/meter map follow. */
  let boundProject: Project | null = null;
  /** When false, explicit play overrides freeze maps until next bind. */
  let followMaps = false;
  let loop: TransportLoop | null = null;
  const ppq = DEFAULT_PPQ;

  let originMs = 0;
  let originTicks = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  const listeners = new Set<Listener>();

  function meterEquals(a: TimeSignature, b: TimeSignature): boolean {
    return a.numerator === b.numerator && a.denominator === b.denominator;
  }

  /** Re-resolve maps at ticks; reanchor when BPM/meter changes mid-play (no jump). */
  function syncMapsAt(ticks: number): void {
    if (!followMaps || !boundProject) return;
    const nextBpm = resolveTempoAt(boundProject, ticks);
    const nextMeter = resolveMeterAt(boundProject, ticks);
    if (nextBpm === bpm && meterEquals(nextMeter, timeSignature)) return;
    positionTicks = ticks;
    bpm = nextBpm;
    timeSignature = { ...nextMeter };
    if (playing) {
      reanchor();
    }
  }

  function samplePosition(): number {
    if (!playing) return positionTicks;
    const elapsedMs = Math.max(0, now() - originMs);
    let ticks = originTicks + elapsedToTicks(elapsedMs, bpm, timeSignature, ppq);
    const wrap = loopWrapTicks(ticks, loop);
    if (wrap != null) {
      ticks = wrap;
      positionTicks = wrap;
      reanchor();
    }
    const prevBpm = bpm;
    const prevMeter = timeSignature;
    syncMapsAt(ticks);
    if (bpm !== prevBpm || !meterEquals(timeSignature, prevMeter)) {
      return positionTicks;
    }
    return ticks;
  }

  function bindProject(project: Project, maps: boolean): void {
    boundProject = project;
    followMaps = maps;
  }

  function applyMapsFromProject(project: Project, atTicks?: number): void {
    bindProject(project, true);
    const ticks = atTicks ?? samplePosition();
    positionTicks = ticks;
    bpm = resolveTempoAt(project, ticks);
    timeSignature = { ...resolveMeterAt(project, ticks) };
  }

  function snapshot(): TransportState {
    positionTicks = samplePosition();
    return {
      playing,
      positionTicks,
      bpm,
      timeSignature: { ...timeSignature },
      ppq,
      activeProjectId,
      loop: loop ? { ...loop } : null,
    };
  }

  function tickMessage(): TransportTickMessage {
    const state = snapshot();
    return {
      type: "transport_tick",
      ...state,
      serverTimeMs: now(),
      sentAtMs: Date.now(),
    };
  }

  function notify(): void {
    const msg = tickMessage();
    for (const listener of listeners) {
      listener(msg);
    }
  }

  function reanchor(): void {
    originMs = now();
    originTicks = positionTicks;
  }

  function stopTimer(): void {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function startTimer(): void {
    stopTimer();
    timer = setInterval(() => {
      notify();
    }, tickIntervalMs);
  }

  return {
    getState(): TransportState {
      return snapshot();
    },

    getActiveProjectId(): string | null {
      return activeProjectId;
    },

    /** True when a usable loop is enabled (blocks auto-setlist advance). */
    isLooping(): boolean {
      return Boolean(loop?.enabled && isUsableLoop(loop));
    },

    toTickMessage(): TransportTickMessage {
      return tickMessage();
    },

    onChange(listener: Listener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    loadProject(projectId: string, project: Project): TransportState {
      activeProjectId = projectId;
      playing = false;
      stopTimer();
      const home = transportHomeTicks(project);
      positionTicks = home;
      applyMapsFromProject(project, home);
      notify();
      return snapshot();
    },

    play(
      opts: TransportPlayBody = {},
      project?: Project,
    ): TransportState {
      if (opts.timeSignature !== undefined) {
        assertValidTimeSignature(opts.timeSignature, ppq);
      }

      const prevProjectId = activeProjectId;
      positionTicks = samplePosition();

      if (opts.projectId !== undefined) {
        activeProjectId = opts.projectId;
      }

      // Switching songs via play({ projectId }) must not keep mid-song ticks.
      if (
        project &&
        opts.projectId !== undefined &&
        opts.projectId !== prevProjectId
      ) {
        positionTicks = transportHomeTicks(project);
      }

      if (project && opts.bpm === undefined && opts.timeSignature === undefined) {
        applyMapsFromProject(project, positionTicks);
      } else {
        if (project) {
          bindProject(project, false);
        }
        if (opts.bpm !== undefined) {
          bpm = opts.bpm;
        }
        if (opts.timeSignature !== undefined) {
          timeSignature = { ...opts.timeSignature };
        }
      }

      playing = true;
      reanchor();
      startTimer();
      notify();
      return snapshot();
    },

    pause(): TransportState {
      positionTicks = samplePosition();
      playing = false;
      stopTimer();
      notify();
      return snapshot();
    },

    /**
     * Pause and seek to transport home (Stop).
     * Home = Countdown / pre-roll start when present; else tick 0 (ADR 0002 / #41).
     */
    stop(project?: Project): TransportState {
      playing = false;
      stopTimer();
      const home = transportHomeTicks(project);
      positionTicks = home;
      if (project) {
        applyMapsFromProject(project, home);
      }
      notify();
      return snapshot();
    },

    seek(nextTicks: number, project?: Project): TransportState {
      if (!Number.isInteger(nextTicks)) {
        throw new RangeError("positionTicks must be an integer");
      }
      positionTicks = nextTicks;
      if (project) {
        applyMapsFromProject(project, positionTicks);
      } else if (followMaps && boundProject) {
        syncMapsAt(positionTicks);
      }
      if (playing) {
        reanchor();
      }
      notify();
      return snapshot();
    },

    setLoop(body: TransportLoopBody): TransportState {
      const prev = loop;
      const startTicks =
        body.startTicks !== undefined
          ? body.startTicks
          : (prev?.startTicks ?? 0);
      const endTicks =
        body.endTicks !== undefined
          ? body.endTicks
          : (prev?.endTicks ?? startTicks);
      const next = normalizeLoop({
        enabled: body.enabled,
        startTicks,
        endTicks,
      });
      if (body.enabled && !next) {
        throw new RangeError(
          "loop requires endTicks > startTicks when enabling",
        );
      }
      // Keep last usable range when disabling without new bounds.
      if (!body.enabled && prev && isUsableLoop(prev)) {
        loop = { ...prev, enabled: false };
      } else {
        loop = next
          ? { ...next, enabled: body.enabled && isUsableLoop(next) }
          : null;
      }
      notify();
      return snapshot();
    },

    dispose(): void {
      stopTimer();
      listeners.clear();
    },
  };
}

export type TransportEngine = ReturnType<typeof createTransportEngine>;
