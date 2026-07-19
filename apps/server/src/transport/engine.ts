import {
  DEFAULT_PPQ,
  TRANSPORT_TICK_INTERVAL_MS,
  assertValidTimeSignature,
  defaultTransportState,
  elapsedToTicks,
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
  const ppq = DEFAULT_PPQ;

  let originMs = 0;
  let originTicks = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  const listeners = new Set<Listener>();

  function samplePosition(): number {
    if (!playing) return positionTicks;
    const elapsedMs = now() - originMs;
    return originTicks + elapsedToTicks(elapsedMs, bpm, timeSignature, ppq);
  }

  function snapshot(): TransportState {
    positionTicks = samplePosition();
    return {
      playing,
      positionTicks,
      bpm,
      timeSignature: { ...timeSignature },
      ppq,
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

    toTickMessage(): TransportTickMessage {
      return tickMessage();
    },

    onChange(listener: Listener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    play(opts: TransportPlayBody = {}): TransportState {
      if (opts.bpm !== undefined) {
        bpm = opts.bpm;
      }
      if (opts.timeSignature !== undefined) {
        assertValidTimeSignature(opts.timeSignature, ppq);
        timeSignature = { ...opts.timeSignature };
      }
      positionTicks = samplePosition();
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

    seek(nextTicks: number): TransportState {
      if (!Number.isInteger(nextTicks)) {
        throw new RangeError("positionTicks must be an integer");
      }
      positionTicks = nextTicks;
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
