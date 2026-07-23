import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  advanceMetronomeClicks,
  metronomeBeatIndex,
  resumeMetronomeAudio,
} from "./metronome.js";
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
  const gains: Array<{
    gain: {
      value: number;
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
        start: vi.fn(),
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

  return { ctx: ctx as unknown as AudioContext, oscillators, gains };
}

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
    expect(advanceMetronomeClicks(base, 0, ctx)).toBe(0);
    expect(
      advanceMetronomeClicks({ ...base, enabled: false }, 0, mockAudioContext().ctx),
    ).toBe(0);
    expect(
      advanceMetronomeClicks({ ...base, playing: false }, 0, mockAudioContext().ctx),
    ).toBe(0);
    expect(oscillators).toHaveLength(0);
  });

  it("schedules accent on bar beat and normal clicks between", () => {
    const { ctx, oscillators } = mockAudioContext("running");
    const next = advanceMetronomeClicks(
      {
        enabled: true,
        playing: true,
        displayTicks: 3840,
        bpm: 120,
        timeSignature: TS_4_4,
        ppq: 960,
      },
      0,
      ctx,
    );
    expect(next).toBe(4);
    expect(oscillators).toHaveLength(4);
    // Beat index 4 ≡ bar downbeat (accent); beats 1–3 are normal clicks.
    expect(oscillators[0]!.frequency.value).toBe(800);
    expect(oscillators[3]!.frequency.value).toBe(1200);
  });

  it("skips ahead without scheduling every click on large seek", () => {
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
    expect(next).toBe(200);
    expect(oscillators.length).toBe(64);
  });

  it("resumeMetronomeAudio resumes suspended context and unlocks", async () => {
    const { ctx } = mockAudioContext("suspended");
    await resumeMetronomeAudio(ctx);
    expect(ctx.resume).toHaveBeenCalledOnce();
    expect(ctx.createBufferSource).toHaveBeenCalledOnce();
  });
});
