import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  advanceMetronomeClicks,
  BASE_ACCENT_GAIN,
  BASE_BEAT_GAIN,
  clickLevelLinear,
  MAX_LATE_CLICK_MS,
  metronomeBeatIndex,
  previewMetronomeClick,
  resumeMetronomeAudio,
  scheduleMetronomeClickAt,
  sharedAudioContextOptions,
} from "./metronome.js";
import {
  DEFAULT_METRONOME_PREFS,
  type MetronomePrefs,
} from "./metronomePrefs.js";
import { setMetronomePrefs } from "./metronomePrefs.js";

const TS_4_4 = { numerator: 4, denominator: 4 } as const;

function mockAudioContext(state: AudioContextState = "running") {
  const oscillators: Array<{
    type: OscillatorType;
    frequency: { value: number };
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
  }> = [];
  const starts: number[] = [];
  const gains: Array<{
    gain: {
      value: number;
      setValueAtTime: ReturnType<typeof vi.fn>;
      exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
    };
    connect: ReturnType<typeof vi.fn>;
  }> = [];

  const ctx: Record<string, unknown> = {
    state,
    currentTime: 1,
    sampleRate: 48_000,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    createBuffer: vi.fn().mockReturnValue({}),
    createBufferSource: vi.fn().mockReturnValue({
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
    }),
    createOscillator: vi.fn(() => {
      const osc = {
        type: "sine" as OscillatorType,
        frequency: { value: 0 },
        start: vi.fn((when?: number) => {
          if (typeof when === "number") starts.push(when);
        }),
        stop: vi.fn(),
        connect: vi.fn(),
      };
      oscillators.push(osc);
      return osc;
    }),
    createGain: vi.fn(() => {
      const gain = {
        gain: {
          value: 0,
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
      gains.push(gain);
      return gain;
    }),
  };
  ctx.createAnalyser = vi.fn(() => ({
    fftSize: 256,
    smoothingTimeConstant: 0.2,
    connect: vi.fn(),
    getFloatTimeDomainData: vi.fn(),
    context: ctx,
  }));

  return { ctx: ctx as unknown as AudioContext, oscillators, gains, starts };
}

describe("clickLevelLinear", () => {
  const fullPrefs: MetronomePrefs = {
    ...DEFAULT_METRONOME_PREFS,
    accentVolume: 100,
    beatVolume: 100,
    masterGainDb: 0,
  };

  it("uses raised base gains at default prefs and 0 dB Click fader", () => {
    expect(BASE_ACCENT_GAIN).toBe(0.7);
    expect(BASE_BEAT_GAIN).toBe(0.45);
    expect(clickLevelLinear(true, fullPrefs)).toBe(BASE_ACCENT_GAIN);
    expect(clickLevelLinear(false, fullPrefs)).toBe(BASE_BEAT_GAIN);
  });

  it("scales with accent/beat volume and master fader", () => {
    expect(
      clickLevelLinear(true, { ...fullPrefs, accentVolume: 50 }),
    ).toBeCloseTo(BASE_ACCENT_GAIN * 0.5);
    expect(
      clickLevelLinear(false, { ...fullPrefs, masterGainDb: -6 }),
    ).toBeCloseTo(BASE_BEAT_GAIN * 0.501, 2);
    expect(
      clickLevelLinear(true, { ...fullPrefs, masterGainDb: -60 }),
    ).toBe(0);
  });
});

describe("sharedAudioContextOptions", () => {
  it("uses playback latency and does not force a low sampleRate", () => {
    const opts = sharedAudioContextOptions();
    expect(opts.latencyHint).toBe("playback");
    expect(opts).not.toHaveProperty("sampleRate");
    expect(opts.sampleRate).toBeUndefined();
  });
});

describe("metronome", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
    });
    setMetronomePrefs({
      accentVolume: 100,
      beatVolume: 100,
      timbre: "default",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("metronomeBeatIndex floors display ticks to beat", () => {
    expect(metronomeBeatIndex(0, TS_4_4, 960)).toBe(0);
    expect(metronomeBeatIndex(959, TS_4_4, 960)).toBe(0);
    expect(metronomeBeatIndex(960, TS_4_4, 960)).toBe(1);
    expect(metronomeBeatIndex(3840, TS_4_4, 960)).toBe(4);
  });

  it("does not schedule when disabled, paused, or ctx suspended", () => {
    const { ctx, oscillators } = mockAudioContext("suspended");
    const base = {
      enabled: true,
      playing: true,
      displayTicks: 1920,
      bpm: 120,
      timeSignature: TS_4_4,
      ppq: 960,
    };
    // Suspended: advance cursor without scheduling (resume-safe).
    expect(advanceMetronomeClicks(base, 0, ctx)).toBe(2);
    expect(oscillators).toHaveLength(0);
    expect(
      advanceMetronomeClicks({ ...base, enabled: false }, 0, mockAudioContext().ctx),
    ).toBe(0);
    expect(
      advanceMetronomeClicks({ ...base, playing: false }, 0, mockAudioContext().ctx),
    ).toBe(0);
  });

  it("schedules ahead using TempoMap when provided", () => {
    const { ctx, oscillators, starts } = mockAudioContext("running");
    const tempoMaps = {
      defaultBpm: 120,
      defaultMeter: TS_4_4,
      tempoMap: [
        { id: "t0", startTicks: 0, bpm: 120 },
        { id: "t1", startTicks: 1920, bpm: 60 },
      ],
      meterMap: [] as {
        startTicks: number;
        numerator: number;
        denominator: number;
      }[],
      ppq: 960,
    };
    // Caught up at beat 2 (display mid-beat @ 60 BPM region) → look-ahead beats up to 2500 ms.
    const next = advanceMetronomeClicks(
      {
        enabled: true,
        playing: true,
        displayTicks: 2400,
        bpm: 120,
        timeSignature: TS_4_4,
        ppq: 960,
        tempoMaps,
      },
      2,
      ctx,
    );
    expect(next).toBe(7);
    expect(oscillators.length).toBeGreaterThanOrEqual(1);
    // 2880−2400 = 480 ticks @ 60 BPM = 500 ms; ctx.currentTime 1 → start 1.5.
    // Flat 120 would be 250 ms → start 1.25.
    expect(starts[0]).toBeCloseTo(1.5, 2);
  });

  it("anchors click gain envelope at schedule time (look-ahead safe)", () => {
    const { ctx, gains, starts } = mockAudioContext("running");
    const when = 1.4;
    scheduleMetronomeClickAt(when, false, undefined, ctx);
    expect(starts[0]).toBe(when);
    expect(gains[0]!.gain.setValueAtTime).toHaveBeenCalledWith(
      BASE_BEAT_GAIN,
      when,
    );
    expect(gains[0]!.gain.exponentialRampToValueAtTime).toHaveBeenCalled();
    const rampAt = gains[0]!.gain.exponentialRampToValueAtTime.mock
      .calls[0]![1] as number;
    expect(rampAt).toBeGreaterThan(when);
  });

  it("look-ahead accent uses bar downbeat frequency", () => {
    const { ctx, oscillators } = mockAudioContext("running");
    // Caught up at beat 3 → look-ahead beat 4 (bar downbeat / accent).
    const next = advanceMetronomeClicks(
      {
        enabled: true,
        playing: true,
        displayTicks: 960 * 3 + 100,
        bpm: 120,
        timeSignature: TS_4_4,
        ppq: 960,
      },
      3,
      ctx,
    );
    expect(next).toBe(8);
    expect(oscillators.length).toBeGreaterThanOrEqual(1);
    expect(oscillators[0]!.frequency.value).toBe(1200);
  });

  it("look-ahead normal beat uses non-accent frequency", () => {
    const { ctx, oscillators } = mockAudioContext("running");
    const next = advanceMetronomeClicks(
      {
        enabled: true,
        playing: true,
        displayTicks: 100,
        bpm: 120,
        timeSignature: TS_4_4,
        ppq: 960,
      },
      0,
      ctx,
    );
    expect(next).toBe(5);
    expect(oscillators.length).toBeGreaterThanOrEqual(1);
    expect(oscillators[0]!.frequency.value).toBe(800);
  });

  it("skips deeply late catch-up clicks without stacking a bang", () => {
    const { ctx, oscillators } = mockAudioContext("running");
    const next = advanceMetronomeClicks(
      {
        enabled: true,
        playing: true,
        displayTicks: 960 * 200,
        bpm: 120,
        timeSignature: TS_4_4,
        ppq: 960,
      },
      0,
      ctx,
    );
    // Cursor jumps; no burst of past oscillators; look-ahead schedules up to lookahead window.
    expect(next).toBe(205);
    expect(oscillators.length).toBe(5);
    expect(MAX_LATE_CLICK_MS).toBe(40);
  });

  it("still fires a barely-late catch-up click once", () => {
    const { ctx, oscillators, starts } = mockAudioContext("running");
    // Mid-beat 2: lastScheduled=1 → while schedules beat 2 only (~slightly late).
    // 120 BPM → 500 ms/beat; display 20 ticks past beat 2 ≈ 10.4 ms late.
    const next = advanceMetronomeClicks(
      {
        enabled: true,
        playing: true,
        displayTicks: 960 * 2 + 20,
        bpm: 120,
        timeSignature: TS_4_4,
        ppq: 960,
      },
      1,
      ctx,
    );
    expect(next).toBe(7);
    expect(oscillators.length).toBeGreaterThanOrEqual(1);
    expect(starts[0]).toBe(1);
  });

  it("schedules clicks on transport loop wrap (when currentBeat < lastScheduledBeat)", () => {
    const { ctx, oscillators } = mockAudioContext("running");
    // Transport was at beat 32, then wrapped back to beat 16 (displayTicks = 960 * 16 = 15360)
    const next = advanceMetronomeClicks(
      {
        enabled: true,
        playing: true,
        displayTicks: 960 * 16,
        bpm: 120,
        timeSignature: TS_4_4,
        ppq: 960,
      },
      32,
      ctx,
    );
    expect(next).toBe(21);
    expect(oscillators.length).toBeGreaterThanOrEqual(1);
  });

  it("does not schedule duplicate clicks when look-ahead pre-scheduled the next beat", () => {
    const { ctx, oscillators } = mockAudioContext("running");
    const input = {
      enabled: true,
      playing: true,
      displayTicks: 10, // In beat 0
      bpm: 120,
      timeSignature: TS_4_4,
      ppq: 960,
    };
    // Frame 1: look-ahead schedules beats up to lookahead and returns 5
    const frame1 = advanceMetronomeClicks(input, 0, ctx);
    expect(frame1).toBe(5);
    const scheduledCount = oscillators.length;

    // Frame 2: displayTicks still in beat 0 (15 ticks), lastScheduledBeat=5
    const frame2 = advanceMetronomeClicks({ ...input, displayTicks: 15 }, frame1, ctx);
    expect(frame2).toBe(5);
    expect(oscillators.length).toBe(scheduledCount); // STILL equal! No duplicate oscillator created!
  });

  it("resumeMetronomeAudio resumes suspended context and unlocks", async () => {
    const { ctx } = mockAudioContext("suspended");
    await resumeMetronomeAudio(ctx);
    expect(ctx.resume).toHaveBeenCalledOnce();
    expect(ctx.createBufferSource).toHaveBeenCalledOnce();
  });

  it("previewMetronomeClick resumes and schedules one accent click", async () => {
    const { ctx, oscillators } = mockAudioContext("suspended");
    setMetronomePrefs({
      accentVolume: 80,
      beatVolume: 40,
      timbre: "bell",
      masterGainDb: 0,
    });
    await previewMetronomeClick(
      {
        accentVolume: 80,
        beatVolume: 40,
        timbre: "bell",
        masterGainDb: 0,
      },
      true,
      ctx as unknown as AudioContext,
    );
    expect(ctx.resume).toHaveBeenCalled();
    expect(oscillators.length).toBe(1);
    expect(oscillators[0]!.frequency.value).toBe(1760);
    expect(oscillators[0]!.start).toHaveBeenCalledOnce();
  });

  it("continues scheduling beats continuously during background tab 1000ms timer intervals", () => {
    const { ctx, oscillators } = mockAudioContext("running");
    const input = {
      enabled: true,
      playing: true,
      displayTicks: 0,
      bpm: 120,
      timeSignature: TS_4_4,
      ppq: 960,
    };
    // Initial start: lookahead fills queue ~2.5s ahead (5 beats)
    let lastBeat = advanceMetronomeClicks(input, 0, ctx);
    expect(lastBeat).toBe(5);
    expect(oscillators.length).toBe(5);

    // Simulate background tab throttling: 1000ms passes (2 beats @ 120 BPM = 1920 ticks)
    input.displayTicks = 1920;
    lastBeat = advanceMetronomeClicks(input, lastBeat, ctx);
    // Queue should replenish future beats up to 2500ms ahead without dropping clicks
    expect(lastBeat).toBe(7);
    expect(oscillators.length).toBe(7);
  });
});
