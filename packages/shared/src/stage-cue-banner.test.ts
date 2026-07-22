import { describe, expect, it } from "vitest";
import { DEFAULT_PPQ } from "./time.js";
import {
  resolveStageCueBanner,
  stageCueBannerLabel,
  STAGE_CUE_DEFAULT_LOOKAHEAD_MS,
} from "./stage-cue-banner.js";

const meter = { numerator: 4, denominator: 4 };
const bar = 4 * DEFAULT_PPQ;

describe("resolveStageCueBanner", () => {
  it("shows session as TERAZ over song cue", () => {
    const { now, next } = resolveStageCueBanner({
      cueClips: [
        {
          id: "c1",
          startTicks: 0,
          lengthTicks: bar,
          label: "Song cue",
        },
      ],
      sessionCue: {
        text: "Live!",
        sentAtMs: 100,
        ttlMs: 6000,
      },
      playheadTicks: 100,
      bpm: 120,
      ppq: DEFAULT_PPQ,
      meter,
      activeRoles: ["karaoke"],
    });
    expect(now).toMatchObject({
      text: "Live!",
      source: "session",
      slot: "now",
    });
    expect(stageCueBannerLabel(now!)).toBe("TERAZ");
    expect(next).toBeNull();
  });

  it("exposes upcoming song cue as ZA N within lookahead", () => {
    // 120 BPM → 10 beats lookahead @ 5s → 10 * PPQ
    const start = 8 * DEFAULT_PPQ;
    const { now, next } = resolveStageCueBanner({
      cueClips: [
        {
          id: "c2",
          startTicks: start,
          lengthTicks: bar,
          label: "Bridge",
        },
      ],
      sessionCue: null,
      playheadTicks: 0,
      bpm: 120,
      ppq: DEFAULT_PPQ,
      meter,
      activeRoles: [],
      lookaheadMs: STAGE_CUE_DEFAULT_LOOKAHEAD_MS,
    });
    expect(now).toBeNull();
    expect(next).toMatchObject({
      text: "Bridge",
      slot: "upcoming",
      barsUntil: 2,
    });
    expect(stageCueBannerLabel(next!)).toBe("ZA 2");
  });

  it("filters session by role intersection", () => {
    const { now } = resolveStageCueBanner({
      cueClips: [],
      sessionCue: {
        text: "Drums only",
        sentAtMs: 1,
        ttlMs: 6000,
        roles: ["drums"],
      },
      playheadTicks: 0,
      bpm: 120,
      ppq: DEFAULT_PPQ,
      meter,
      activeRoles: ["karaoke"],
    });
    expect(now).toBeNull();
  });

  it("prefers alert session priority", () => {
    const { now } = resolveStageCueBanner({
      cueClips: [],
      sessionCue: {
        text: "ALERT",
        sentAtMs: 1,
        ttlMs: 0,
        priority: "alert",
      },
      playheadTicks: 0,
      bpm: 100,
      ppq: DEFAULT_PPQ,
      meter,
      activeRoles: ["grid"],
    });
    expect(now?.priority).toBe("alert");
  });

  it("picks alert among multiple sessionCues", () => {
    const { now } = resolveStageCueBanner({
      cueClips: [],
      sessionCues: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          text: "Normal",
          sentAtMs: 100,
          ttlMs: 0,
          priority: "normal",
        },
        {
          id: "00000000-0000-4000-8000-000000000002",
          text: "ALERT",
          sentAtMs: 50,
          ttlMs: 0,
          priority: "alert",
        },
      ],
      playheadTicks: 0,
      bpm: 120,
      ppq: DEFAULT_PPQ,
      meter,
      activeRoles: ["karaoke"],
    });
    expect(now).toMatchObject({
      text: "ALERT",
      priority: "alert",
      source: "session",
      id: "session:00000000-0000-4000-8000-000000000002",
    });
  });
});
