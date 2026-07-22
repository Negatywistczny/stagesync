/**
 * Host MIDI I/O + clock — SSOT = transport engine (ADR 0002 / 0010).
 *
 * - Clock OUT: Start/Continue/Stop/SPP/Clock on selected output from transport.
 * - Clock IN: rate meters for Admin; beat boundaries for Beat→WS meter.
 * - No MIDI device I/O in Tauri.
 */

import {
  MIDI_CLOCK_PPQN,
  midiClockIntervalMs,
  ticksToSpp,
  type MidiHostConfig,
  type MidiHostStatus,
  type TransportTickMessage,
} from "@stagesync/shared";
import type { MidiBackend, MidiRealtimeMessage } from "./backend.js";
import { createDefaultMidiBackend } from "./native-backend.js";
import type { TransportEngine } from "../transport/engine.js";

const WINDOW_MS = 1000;

class RateMeter {
  private stamps: number[] = [];

  hit(now: number): void {
    if (!Number.isFinite(now)) return;
    this.stamps.push(now);
    this.prune(now);
  }

  rate(now: number): number {
    if (!Number.isFinite(now)) return 0;
    this.prune(now);
    return this.stamps.length;
  }

  private prune(now: number): void {
    if (!Number.isFinite(now)) return;
    const cutoff = now - WINDOW_MS;
    while (this.stamps.length > 0 && this.stamps[0]! < cutoff) {
      this.stamps.shift();
    }
  }
}

export type MidiHostOptions = {
  backend?: MidiBackend;
  now?: () => number;
  /** Called when a quarter-note boundary arrives on MIDI clock in. */
  onBeatToWs?: () => void;
  /** Optional: Program Change on input → load project by midiProgramId. */
  onProgramChange?: (program: number) => void;
};

export function createMidiHost(
  transport: TransportEngine,
  options: MidiHostOptions = {},
) {
  const backend = options.backend ?? createDefaultMidiBackend();
  const now = options.now ?? (() => Date.now());

  let config: MidiHostConfig = {
    inputId: process.env.STAGESYNC_MIDI_INPUT?.trim() || null,
    outputId: process.env.STAGESYNC_MIDI_OUTPUT?.trim() || null,
    clockOutEnabled: true,
  };

  let lastError: string | null = null;
  let clockOutActive = false;
  let clockTimer: ReturnType<typeof setInterval> | null = null;
  let wasPlaying = false;
  let lastBpm: number | null = null;
  let lastTicks: number | null = null;
  let inputClockCount = 0;

  const clockIn = new RateMeter();
  const sppIn = new RateMeter();
  const pcIn = new RateMeter();
  const beatToWs = new RateMeter();

  function setError(err: unknown): void {
    const raw = err instanceof Error ? err.message : String(err);
    lastError = raw.slice(0, 500);
  }

  function clearError(): void {
    lastError = null;
  }

  function stopClockOutTimer(): void {
    if (clockTimer !== null) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
    clockOutActive = false;
  }

  function startClockOutTimer(bpm: number): void {
    stopClockOutTimer();
    if (!config.clockOutEnabled || !config.outputId) return;
    const interval = midiClockIntervalMs(bpm);
    clockOutActive = true;
    lastBpm = bpm;
    clockTimer = setInterval(() => {
      backend.send({ type: "clock" });
    }, interval);
  }

  function sendTransportEdge(
    msg: TransportTickMessage,
    edge: "start" | "stop" | "continue",
  ): void {
    if (!config.clockOutEnabled || !config.outputId) return;
    if (edge === "start" || edge === "continue") {
      backend.send({
        type: "spp",
        value: ticksToSpp(msg.positionTicks, msg.ppq),
      });
      backend.send({ type: edge });
      startClockOutTimer(msg.bpm);
    } else {
      stopClockOutTimer();
      backend.send({ type: "stop" });
    }
  }

  function onTransport(msg: TransportTickMessage): void {
    if (!config.clockOutEnabled || !config.outputId) {
      if (wasPlaying && !msg.playing) {
        stopClockOutTimer();
      }
      wasPlaying = msg.playing;
      lastTicks = msg.positionTicks;
      return;
    }

    if (msg.playing && !wasPlaying) {
      const edge = msg.positionTicks > 0 ? "continue" : "start";
      sendTransportEdge(msg, edge);
    } else if (!msg.playing && wasPlaying) {
      sendTransportEdge(msg, "stop");
    } else if (msg.playing && clockOutActive) {
      if (lastBpm !== msg.bpm) {
        startClockOutTimer(msg.bpm);
      }
      // Seek while playing: position jumped more than a quarter → re-SPP + Continue.
      if (
        lastTicks != null &&
        Math.abs(msg.positionTicks - lastTicks) > msg.ppq
      ) {
        sendTransportEdge(msg, "continue");
      }
    }
    wasPlaying = msg.playing;
    lastTicks = msg.positionTicks;
  }

  function onInputMessage(msg: MidiRealtimeMessage): void {
    const t = now();
    switch (msg.type) {
      case "clock":
        clockIn.hit(t);
        inputClockCount += 1;
        if (inputClockCount % MIDI_CLOCK_PPQN === 0) {
          beatToWs.hit(t);
          options.onBeatToWs?.();
        }
        break;
      case "spp":
        sppIn.hit(t);
        break;
      case "program":
        pcIn.hit(t);
        options.onProgramChange?.(msg.program);
        break;
      case "start":
        inputClockCount = 0;
        break;
      case "stop":
      case "continue":
        break;
    }
  }

  function applyPorts(): void {
    try {
      backend.closeInput();
      backend.closeOutput();
      if (config.inputId) {
        backend.openInput(config.inputId, onInputMessage);
      }
      if (config.outputId) {
        backend.openOutput(config.outputId);
      }
      clearError();
      const state = transport.getState();
      if (state.playing && config.clockOutEnabled && config.outputId) {
        const edge = state.positionTicks > 0 ? "continue" : "start";
        sendTransportEdge(
          {
            type: "transport_tick",
            ...state,
            serverTimeMs: 0,
            sentAtMs: now(),
          },
          edge,
        );
      } else {
        stopClockOutTimer();
      }
    } catch (err) {
      setError(err);
      stopClockOutTimer();
    }
  }

  if (config.inputId || config.outputId) {
    applyPorts();
  }

  const unsub = transport.onChange(onTransport);

  return {
    getStatus(): MidiHostStatus {
      const t = now();
      return {
        available: backend.kind !== "none",
        backend: backend.kind,
        config: { ...config },
        inputs: backend.listInputs(),
        outputs: backend.listOutputs(),
        rates: {
          clockPerSec: clockIn.rate(t),
          sppPerSec: sppIn.rate(t),
          pcPerSec: pcIn.rate(t),
          beatToWsPerSec: beatToWs.rate(t),
        },
        clockOutActive,
        lastError,
      };
    },

    getConfig(): MidiHostConfig {
      return { ...config };
    },

    setConfig(patch: Partial<MidiHostConfig>): MidiHostConfig {
      config = {
        inputId:
          patch.inputId !== undefined ? patch.inputId : config.inputId,
        outputId:
          patch.outputId !== undefined ? patch.outputId : config.outputId,
        clockOutEnabled:
          patch.clockOutEnabled !== undefined
            ? patch.clockOutEnabled
            : config.clockOutEnabled,
      };
      applyPorts();
      return { ...config };
    },

    handleInputMessage(msg: MidiRealtimeMessage): void {
      onInputMessage(msg);
    },

    dispose(): void {
      unsub();
      stopClockOutTimer();
      backend.dispose();
    },
  };
}

export type MidiHost = ReturnType<typeof createMidiHost>;
