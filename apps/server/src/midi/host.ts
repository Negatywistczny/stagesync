/**
 * Host MIDI I/O + clock — SSOT = transport engine (ADR 0002 / 0010).
 *
 * - Clock OUT: Start/Continue/Stop/SPP from transport edges; Clock pulses from
 *   domain tick deltas (not an independent setInterval).
 * - Clock IN: rate meters for Admin; beat boundaries for Beat→WS meter.
 * - No MIDI device I/O in Tauri.
 */

import {
  MIDI_CLOCK_PPQN,
  ticksToMidiClockIndex,
  sppToTicks,
  ticksToSpp,
  type MidiHostConfig,
  type MidiHostStatus,
  type TransportTickMessage,
} from "@stagesync/shared";
import type { MidiBackend, MidiRealtimeMessage } from "./backend.js";
import {
  loadMidiHostConfigFile,
  resolveBootMidiConfig,
  saveMidiHostConfigFile,
} from "./config-persist.js";
import { createDefaultMidiBackend } from "./native-backend.js";
import type { TransportEngine } from "../transport/engine.js";

const WINDOW_MS = 1000;
/** Max MIDI clock pulses emitted in one transport notify (anti-flood on huge jumps). */
const MAX_CLOCK_BURST = MIDI_CLOCK_PPQN * 8;

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
  /**
   * Clamp MIDI IN seek targets (e.g. to project end). Default: max(0, ticks).
   */
  clampSeekTicks?: (ticks: number) => number;
  /** Absolute path to midi-config.json — load at boot, save on setConfig. */
  configFile?: string;
  /** Override initial config (tests); otherwise env + optional file. */
  initialConfig?: MidiHostConfig;
};

export function createMidiHost(
  transport: TransportEngine,
  options: MidiHostOptions = {},
) {
  const backend = options.backend ?? createDefaultMidiBackend();
  const now = options.now ?? (() => Date.now());
  const clampSeek =
    options.clampSeekTicks ?? ((ticks: number) => Math.max(0, ticks));

  let config: MidiHostConfig = (() => {
    if (options.initialConfig) {
      return { ...options.initialConfig };
    }
    let fromFile: MidiHostConfig | null = null;
    if (options.configFile) {
      try {
        fromFile = loadMidiHostConfigFile(options.configFile);
      } catch (err) {
        const raw = err instanceof Error ? err.message : String(err);
        console.error(`[midi] invalid config file ${options.configFile}: ${raw}`);
      }
    }
    return resolveBootMidiConfig(fromFile);
  })();

  let lastError: string | null = null;
  let clockOutActive = false;
  /** Last MIDI clock index emitted while clock OUT is active (tick-driven). */
  let lastEmittedClockIndex: number | null = null;
  let wasPlaying = false;
  let lastTicks: number | null = null;
  let inputClockCount = 0;
  /** Last Song Position Pointer (ticks) from MIDI IN — applied on Start/Continue. */
  let lastSppTicks: number | null = null;

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

  function stopClockOut(): void {
    clockOutActive = false;
    lastEmittedClockIndex = null;
  }

  /** Never throw from MIDI OUT — USB unplug must not kill the host process. */
  function safeSend(msg: MidiRealtimeMessage): boolean {
    try {
      backend.send(msg);
      return true;
    } catch (err) {
      setError(err);
      return false;
    }
  }

  function emitClocksThrough(positionTicks: number, ppq: number): void {
    if (!clockOutActive || !config.outputId) return;
    const idx = ticksToMidiClockIndex(Math.max(0, positionTicks), ppq);
    if (lastEmittedClockIndex == null) {
      lastEmittedClockIndex = idx;
      return;
    }
    const from = lastEmittedClockIndex;
    if (idx <= from) {
      lastEmittedClockIndex = idx;
      return;
    }
    const target = Math.min(idx, from + MAX_CLOCK_BURST);
    for (let i = from + 1; i <= target; i += 1) {
      if (!safeSend({ type: "clock" })) {
        stopClockOut();
        return;
      }
    }
    lastEmittedClockIndex = idx;
  }

  function sendTransportEdge(
    msg: TransportTickMessage,
    edge: "start" | "stop" | "continue",
  ): void {
    if (!config.clockOutEnabled || !config.outputId) return;
    if (edge === "start" || edge === "continue") {
      if (
        !safeSend({
          type: "spp",
          value: ticksToSpp(msg.positionTicks, msg.ppq),
        })
      ) {
        stopClockOut();
        return;
      }
      if (!safeSend({ type: edge })) {
        stopClockOut();
        return;
      }
      clockOutActive = true;
      lastEmittedClockIndex = ticksToMidiClockIndex(
        Math.max(0, msg.positionTicks),
        msg.ppq,
      );
    } else {
      stopClockOut();
      safeSend({ type: "stop" });
    }
  }

  function onTransport(msg: TransportTickMessage): void {
    if (!config.clockOutEnabled || !config.outputId) {
      if (wasPlaying && !msg.playing) {
        stopClockOut();
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
      // Seek while playing: position jumped more than a quarter → re-SPP + Continue.
      if (
        lastTicks != null &&
        Math.abs(msg.positionTicks - lastTicks) > msg.ppq
      ) {
        sendTransportEdge(msg, "continue");
      } else {
        emitClocksThrough(msg.positionTicks, msg.ppq);
      }
    }
    wasPlaying = msg.playing;
    lastTicks = msg.positionTicks;
  }

  function seekFromMidi(rawTicks: number): void {
    const ticks = clampSeek(rawTicks);
    if (!Number.isInteger(ticks)) return;
    transport.seek(ticks);
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
        lastSppTicks = sppToTicks(msg.value, transport.getState().ppq);
        break;
      case "program":
        pcIn.hit(t);
        options.onProgramChange?.(msg.program);
        break;
      case "start":
        inputClockCount = 0;
        try {
          if (lastSppTicks != null) {
            seekFromMidi(lastSppTicks);
          } else {
            seekFromMidi(0);
          }
          transport.play();
        } catch (err) {
          setError(err);
        }
        break;
      case "continue":
        try {
          if (lastSppTicks != null) {
            seekFromMidi(lastSppTicks);
          }
          transport.play();
        } catch (err) {
          setError(err);
        }
        break;
      case "stop":
        try {
          transport.pause();
        } catch (err) {
          setError(err);
        }
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
        stopClockOut();
      }
    } catch (err) {
      setError(err);
      stopClockOut();
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
      if (options.configFile) {
        try {
          saveMidiHostConfigFile(options.configFile, config);
        } catch (err) {
          setError(err);
        }
      }
      return { ...config };
    },

    handleInputMessage(msg: MidiRealtimeMessage): void {
      onInputMessage(msg);
    },

    /** Program Change on the configured output (song load / patch recall). */
    sendProgramChange(program: number, channel = 0): void {
      if (!Number.isInteger(program) || program < 0 || program > 127) return;
      if (!Number.isInteger(channel) || channel < 0 || channel > 15) return;
      if (!config.outputId) return;
      if (safeSend({ type: "program", channel, program })) {
        clearError();
      }
    },

    /**
     * Panic / MUTE ALL — All Sound Off, Reset Controllers, All Notes Off
     * on every MIDI channel (0–15) of the configured output.
     */
    panic(): { sent: boolean; channels: number } {
      if (!config.outputId) {
        return { sent: false, channels: 0 };
      }
      for (let channel = 0; channel < 16; channel += 1) {
        if (
          !safeSend({
            type: "cc",
            channel,
            controller: 120,
            value: 0,
          }) ||
          !safeSend({
            type: "cc",
            channel,
            controller: 121,
            value: 0,
          }) ||
          !safeSend({
            type: "cc",
            channel,
            controller: 123,
            value: 0,
          })
        ) {
          return { sent: false, channels: 0 };
        }
      }
      clearError();
      return { sent: true, channels: 16 };
    },

    dispose(): void {
      unsub();
      stopClockOut();
      backend.dispose();
    },
  };
}

export type MidiHost = ReturnType<typeof createMidiHost>;
