import {
  DEFAULT_PPQ,
  TRANSPORT_TICK_INTERVAL_MS,
  assertValidTimeSignature,
  defaultTransportState,
  elapsedToTicks,
  resolveMeterAt,
  resolveTempoAt,
  type ProjectV2,
  type TimeSignature,
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
  const ppq = DEFAULT_PPQ;

  let originMs = 0;
  let originTicks = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  const listeners = new Set<Listener>();

  function samplePosition(): number {
    if (!playing) return positionTicks;
    const elapsedMs = Math.max(0, now() - originMs);
    return originTicks + elapsedToTicks(elapsedMs, bpm, timeSignature, ppq);
  }

  function applyMapsFromProject(project: ProjectV2, atTicks?: number): void {
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
    };
  }

  function tickMessage(): TransportTickMessage {
    const state = snapshot();
    return {
      type: "transport_tick",
      ...state,
      serverTimeMs: now(),
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

    toTickMessage(): TransportTickMessage {
      return tickMessage();
    },

    onChange(listener: Listener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    loadProject(projectId: string, project: ProjectV2): TransportState {
      activeProjectId = projectId;
      positionTicks = samplePosition();
      playing = false;
      stopTimer();
      applyMapsFromProject(project, 0);
      notify();
      return snapshot();
    },

    play(
      opts: TransportPlayBody = {},
      project?: ProjectV2,
    ): TransportState {
      if (opts.timeSignature !== undefined) {
        assertValidTimeSignature(opts.timeSignature, ppq);
      }

      positionTicks = samplePosition();

      if (opts.projectId !== undefined) {
        activeProjectId = opts.projectId;
      }

      if (project && opts.bpm === undefined && opts.timeSignature === undefined) {
        applyMapsFromProject(project, positionTicks);
      } else {
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

    seek(nextTicks: number, project?: ProjectV2): TransportState {
      if (!Number.isInteger(nextTicks)) {
        throw new RangeError("positionTicks must be an integer");
      }
      positionTicks = nextTicks;
      if (project) {
        bpm = resolveTempoAt(project, positionTicks);
        timeSignature = { ...resolveMeterAt(project, positionTicks) };
      }
      if (playing) {
        reanchor();
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
