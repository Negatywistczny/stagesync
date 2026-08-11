import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createProjectSeed } from "../project/project-seed.js";
import { ProjectSchema } from "../project/schema.js";
import {
  applyUsUgBridgeToProject,
  bridgeUsUgImport,
  isUgBridgeNoiseLine,
  suggestGridBpmFromUsUgTexts,
} from "./text-anchor-bridge.js";
import { importUltrastarText } from "../import/ultrastar/ultrastar-import.js";
import {
  US_UG_BACKING_CLIP_ID,
  suggestBeat1MsFromPipeAndGap,
} from "../smart-tempo/smart-tempo.js";
import { secondsToTicks } from "../time-tempo/tempo-map.js";
import { DEFAULT_PPQ } from "../time-tempo/time.js";

const FIX = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
  "us-ug",
);

function loadPair(name: string): { us: string; ug: string } {
  return {
    us: readFileSync(join(FIX, name, "song.txt"), "utf8"),
    ug: readFileSync(join(FIX, name, "chords.txt"), "utf8"),
  };
}

describe("isUgBridgeNoiseLine", () => {
  it("flags transpose / beat grid / multi-header blurbs", () => {
    expect(isUgBridgeNoiseLine("[Intro] / [Chorus] and [Bridge]")).toBe(true);
    expect(isUgBridgeNoiseLine("Transpose -5 to D + capo 4")).toBe(true);
    expect(isUgBridgeNoiseLine("1 + 2 + 3 + 4 +")).toBe(true);
    expect(isUgBridgeNoiseLine("| [G] | [Am] |")).toBe(false);
    expect(isUgBridgeNoiseLine("I don't wanna talk")).toBe(false);
  });
});

describe("bridgeUsUgImport API", () => {
  it("rejects empty UG", () => {
    const us = importUltrastarText(loadPair("demo-simple").us);
    expect(us.ok).toBe(true);
    if (!us.ok) return;
    const r = bridgeUsUgImport(us, "   ");
    expect(r.ok).toBe(false);
  });

  it("uses audio analysis as tempo SSOT (not US seed BPM)", () => {
    const pair = loadPair("demo-simple");
    const us = importUltrastarText(pair.us);
    expect(us.ok).toBe(true);
    if (!us.ok) return;
    const beatMs = Array.from({ length: 33 }, (_, i) => i * 500);
    const r = bridgeUsUgImport(us, pair.ug, {
      smartTempoAudio: {
        assetId: "a1",
        durationMs: 20_000,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: 0,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: 120,
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.seedBpm).toBe(120);
    expect(r.tempoMap.length).toBeGreaterThan(0);
    expect(r.tempoMap[0]!.startTicks).toBe(0);
    expect(r.tempoNodes.length).toBeGreaterThan(0);
    // Constant grid → Logic-like sparse map (not one event per beat).
    expect(r.tempoMap.length).toBeLessThanOrEqual(beatMs.length / 2);
    expect(r.warnings.some((w) => /eksperymentalny/i.test(w))).toBe(false);
  });

  it("audio SSOT: draft nodes without user edit do not override audio map", () => {
    const BAR = 3840;
    const pair = loadPair("demo-simple");
    const us = importUltrastarText(pair.us);
    expect(us.ok).toBe(true);
    if (!us.ok) return;
    const beatMs = Array.from({ length: 33 }, (_, i) => i * 500);
    const sparseNodes = [
      { wallMs: 0, targetTick: 0 },
      { wallMs: 4000, targetTick: BAR },
      { wallMs: 8000, targetTick: BAR * 2 },
    ];
    const r = bridgeUsUgImport(us, pair.ug, {
      smartTempoAudio: {
        assetId: "a1",
        durationMs: 20_000,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: 0,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: 120,
      },
      draftTempoNodes: sparseNodes,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Auto draft markers must not replace audio-driven sparse map.
    expect(r.seedBpm).toBe(120);
    expect(r.tempoMap[0]!.bpm).toBeCloseTo(120, 0);

    const edited = bridgeUsUgImport(us, pair.ug, {
      smartTempoAudio: {
        assetId: "a1",
        durationMs: 20_000,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: 0,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: 120,
      },
      draftTempoNodes: sparseNodes,
      draftTempoNodesUserEdited: true,
    });
    expect(edited.ok).toBe(true);
    if (!edited.ok) return;
    expect(edited.tempoMap.length).toBeLessThanOrEqual(sparseNodes.length + 2);
  });

  it("winner-intro-vc with audio: Forma from words (pickup in Intro, Chorus on winner)", () => {
    const { us, ug } = loadPair("winner-intro-vc");
    const usImport = importUltrastarText(us);
    expect(usImport.ok).toBe(true);
    if (!usImport.ok) return;

    const durationMs = 180_000;
    const gapMs = usImport.gapMs;
    expect(gapMs).toBe(33_000);
    // Editorial Beat 1 for pipe 16 + GAP @ 120 → 0 (pickup at 16.5 bars).
    const offsetMs = suggestBeat1MsFromPipeAndGap({
      gapMs,
      pipeBarCount: 16,
      layoutBpm: 120,
      transientMs: 2_000, // ignore late transient (>½ bar from ideal)
    });
    expect(offsetMs).toBe(0);
    const beatMs = Array.from({ length: 360 }, (_, i) => i * 500);

    const r = bridgeUsUgImport(usImport, ug, {
      idPrefix: "winner-audio",
      smartTempoAudio: {
        assetId: "a1",
        durationMs,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: offsetMs,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: 120,
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const BAR = 3840;
    const intro = r.formaMusic.clips.find((c) => c.name === "Intro")!;
    const verse = r.formaMusic.clips.find((c) => c.name === "Verse")!;
    const chorus = r.formaMusic.clips.find((c) => c.name === "Chorus")!;
    expect(intro.startTicks).toBe(0);
    // Pipe Intro absorbs anacrusis → Verse Forma on barline after pickup.
    expect(verse.startTicks).toBe(17 * BAR);
    expect(intro.lengthTicks).toBe(verse.startTicks);
    expect(verse.lengthTicks % BAR).toBe(0);
    expect(verse.lengthTicks).toBeGreaterThanOrEqual(8 * BAR);
    expect(chorus.startTicks).toBe(verse.startTicks + verse.lengthTicks);

    // Pickup in last Intro bar; Verse downbeat = Forma Verse
    const firstVocal = r.tekst.clips[0]!;
    expect(firstVocal.startTicks).toBeGreaterThanOrEqual(
      verse.startTicks - BAR,
    );
    expect(firstVocal.startTicks).toBeLessThan(verse.startTicks);

    const about = r.tekst.clips.find((c) => /About/i.test(c.text));
    expect(about).toBeTruthy();
    const dfSharp = r.akordy.clips.find((c) => c.symbol === "D/F#");
    expect(dfSharp).toBeTruthy();
    // D/F# lands on / near the aligned “About” word (not a fixed bar index).
    expect(Math.abs(dfSharp!.startTicks - about!.startTicks)).toBeLessThan(
      2 * BAR,
    );

    const winnerLine = r.tekst.clips.find((c) => /winner takes/i.test(c.text));
    expect(winnerLine).toBeTruthy();
    expect(winnerLine!.sourceSection).toBe("Chorus");
    // Chorus Forma covers the Chorus lyric (not leftover Verse lines).
    expect(winnerLine!.startTicks).toBeGreaterThanOrEqual(
      chorus.startTicks - BAR,
    );
    expect(winnerLine!.startTicks).toBeLessThan(
      chorus.startTicks + chorus.lengthTicks,
    );

    expect(r.seedBpm).toBeCloseTo(120, 0);
    expect(r.tempoMap.every((ev) => ev.bpm >= 60 && ev.bpm <= 200)).toBe(true);

    const applied = applyUsUgBridgeToProject(
      createProjectSeed("w-audio", "Winner", "2026-08-03T00:00:00.000Z"),
      r,
      {
        smartTempoAudio: {
          assetId: "a1",
          durationMs,
          peaks: [0.1, 0.5],
          audioStartOffsetMs: offsetMs,
        },
      },
    );
    const clip = applied.audioClips.find((c) => c.id === US_UG_BACKING_CLIP_ID);
    expect(clip?.startTicks).toBe(0);
    expect(clip?.trimInMs).toBeUndefined();
    expect(() => ProjectSchema.parse(applied)).not.toThrow();
  });

  it("winner-style SingStar GAP: TempoMap seed follows audio, not pipe+GAP formula", () => {
    // Live Winner: #GAP 35140 → naive pipe formula 112.69. That formula must
    // NOT become Adapt tempo — audio estimatedBpm is SSOT (even if currently
    // imperfect). Pipe/GAP remains for Beat 1 / Forma only.
    const us = `#TITLE:The Winner Takes It All
#ARTIST:ABBA
#BPM:339.36
#GAP:35140
: 0 6 25 I 
: 7 6 27 don’t 
- 33
E
`;
    const { ug } = loadPair("winner-intro-vc");
    const usImport = importUltrastarText(us);
    expect(usImport.ok).toBe(true);
    if (!usImport.ok) return;
    expect(usImport.gapMs).toBe(35140);

    const audioBpm = 122.5;
    const period = 60_000 / audioBpm;
    const beatMs = Array.from({ length: 400 }, (_, i) =>
      Math.round(i * period),
    );
    const offsetMs = suggestBeat1MsFromPipeAndGap({
      gapMs: 35140,
      pipeBarCount: 16,
      layoutBpm: 120,
    });
    expect(offsetMs).toBeGreaterThan(1000);

    const r = bridgeUsUgImport(usImport, ug, {
      idPrefix: "winner-gap35",
      smartTempoAudio: {
        assetId: "a1",
        durationMs: 240_000,
        peaks: [0.1],
        audioStartOffsetMs: offsetMs,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: audioBpm,
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.seedBpm).toBeCloseTo(audioBpm, 0);
    expect(r.tempoMap[0]!.bpm).toBeGreaterThanOrEqual(118);
    // Pipe formula alone would be ~112.69 — must not win
    expect(r.seedBpm).not.toBeCloseTo(112.69, 0);
  });

  it("long-track Smart Tempo stays sparse and validates as Project (no orphan template)", () => {
    const { us, ug } = loadPair("winner-intro-vc");
    const usImport = importUltrastarText(us);
    expect(usImport.ok).toBe(true);
    if (!usImport.ok) return;

    const durationMs = 240_000;
    const bpm = 120;
    const period = 60_000 / bpm;
    const beatCount = Math.ceil(durationMs / period) + 1;
    const beatMs = Array.from({ length: beatCount }, (_, i) =>
      Math.round(i * period),
    );
    const offsetMs = usImport.gapMs;

    const r = bridgeUsUgImport(usImport, ug, {
      idPrefix: "dense-map",
      smartTempoAudio: {
        assetId: "local-pending",
        durationMs,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: offsetMs,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: bpm,
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    // Logic-like sparse map from a long constant beat grid (not one event/beat).
    expect(beatMs.length).toBeGreaterThan(256);
    expect(r.tempoMap.length).toBeGreaterThan(0);
    expect(r.tempoMap.length).toBeLessThan(128);
    expect(r.tempoMap.length).toBeLessThanOrEqual(2048);

    const applied = applyUsUgBridgeToProject(
      createProjectSeed("dense", "Winner", "2026-08-03T00:00:00.000Z"),
      r,
      {
        smartTempoAudio: {
          assetId: "local-pending",
          durationMs,
          peaks: [0.1, 0.5],
          audioStartOffsetMs: offsetMs,
        },
      },
    );

    // Bridged content — not bare Countdown+Intro seed.
    expect(applied.forma.clips.some((c) => c.name === "Verse")).toBe(true);
    expect(applied.forma.clips.some((c) => c.name === "Chorus")).toBe(true);
    expect(applied.tekst.clips.length).toBeGreaterThan(0);
    expect(applied.akordy.clips.length).toBeGreaterThan(0);
    expect(applied.tempoMap.length).toBe(r.tempoMap.length);
    // Synthetic wizard id must not place a stub clip before real upload.
    expect(applied.audioClips.some((c) => c.id === US_UG_BACKING_CLIP_ID)).toBe(
      false,
    );

    expect(() => ProjectSchema.parse(applied)).not.toThrow();

    const withRealAsset = applyUsUgBridgeToProject(applied, r, {
      smartTempoAudio: {
        assetId: "asset-real-1",
        durationMs,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: offsetMs,
      },
    });
    expect(
      withRealAsset.audioClips.some((c) => c.id === US_UG_BACKING_CLIP_ID),
    ).toBe(true);
    const realClip = withRealAsset.audioClips.find(
      (c) => c.id === US_UG_BACKING_CLIP_ID,
    );
    expect(realClip?.trimInMs).toBe(offsetMs);
    expect(() => ProjectSchema.parse(withRealAsset)).not.toThrow();
  });

  it("winner-intro-vc with ~120 BPM audio (content-epoch): text near tick 0, Forma follows words", () => {
    const { us, ug } = loadPair("winner-intro-vc");
    const usImport = importUltrastarText(us);
    expect(usImport.ok).toBe(true);
    if (!usImport.ok) return;

    const bpm =
      suggestGridBpmFromUsUgTexts(us, ug) ?? usImport.ultrastarMetronomeBpm;
    expect(bpm).toBeCloseTo(120, 0);
    const period = 60_000 / bpm;
    const durationMs = 180_000;
    const offsetMs = usImport.gapMs;
    const beatCount = Math.min(512, Math.ceil(durationMs / period) + 1);
    const beatMs = Array.from({ length: beatCount }, (_, i) =>
      Math.round(i * period),
    );

    const r = bridgeUsUgImport(usImport, ug, {
      idPrefix: "winner-pipe-audio",
      smartTempoAudio: {
        assetId: "a1",
        durationMs,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: offsetMs,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: bpm,
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const BAR = 3840;
    expect(r.seedBpm).toBeCloseTo(bpm, 0);
    const verse = r.formaMusic.clips.find((c) => c.name === "Verse")!;
    const chorus = r.formaMusic.clips.find((c) => c.name === "Chorus")!;

    const firstVocal = r.tekst.clips[0]!;
    // Content-epoch: first US note @ #GAP → near tick 0 (Beat 1)
    expect(firstVocal.startTicks).toBeLessThan(BAR);
    // Forma Verse starts on/after pickup barline near the vocal.
    expect(verse.startTicks).toBeLessThanOrEqual(BAR);
    expect(firstVocal.startTicks).toBeLessThanOrEqual(verse.startTicks);
    expect(chorus.startTicks).toBe(verse.startTicks + verse.lengthTicks);

    const winnerLine = r.tekst.clips.find((c) => /winner takes/i.test(c.text));
    expect(winnerLine).toBeTruthy();
    expect(winnerLine!.startTicks).toBeGreaterThanOrEqual(
      chorus.startTicks - BAR,
    );
  });

  it("winner-intro-vc: dynamic BPM map — Forma still follows word links", () => {
    const { us, ug } = loadPair("winner-intro-vc");
    const usImport = importUltrastarText(us);
    expect(usImport.ok).toBe(true);
    if (!usImport.ok) return;

    const durationMs = 180_000;
    const offsetMs = usImport.gapMs;
    // Mild tempo drift around 120 BPM — map must stay dynamic
    let t = 0;
    const beatMs: number[] = [0];
    for (let i = 1; i < 400 && t < durationMs; i++) {
      const period = 500 + Math.round(12 * Math.sin(i / 7));
      t += period;
      beatMs.push(t);
    }

    const r = bridgeUsUgImport(usImport, ug, {
      idPrefix: "winner-dyn",
      smartTempoAudio: {
        assetId: "a1",
        durationMs,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: offsetMs,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: 118,
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const BAR = 3840;
    const verse = r.formaMusic.clips.find((c) => c.name === "Verse")!;
    const chorus = r.formaMusic.clips.find((c) => c.name === "Chorus")!;

    expect(r.tempoMap.length).toBeGreaterThan(1);
    const bpms = r.tempoMap.map((e) => e.bpm);
    expect(Math.max(...bpms) - Math.min(...bpms)).toBeGreaterThan(1);

    const firstVocal = r.tekst.clips[0]!;
    expect(firstVocal.startTicks).toBeLessThan(BAR);
    expect(chorus.startTicks).toBe(verse.startTicks + verse.lengthTicks);

    // Content-epoch: Beat 1 → tick 0 on the map
    expect(
      secondsToTicks(
        0,
        r.tempoMap,
        r.seedBpm,
        { numerator: 4, denominator: 4 },
        DEFAULT_PPQ,
      ),
    ).toBe(0);
  });

  it("winner-intro-vc: Beat 1 at file start — pickup before Verse Forma", () => {
    const { us, ug } = loadPair("winner-intro-vc");
    const usImport = importUltrastarText(us);
    expect(usImport.ok).toBe(true);
    if (!usImport.ok) return;

    const durationMs = 180_000;
    const gapMs = usImport.gapMs;
    const beatMs = Array.from({ length: 360 }, (_, i) => i * 500);

    const r = bridgeUsUgImport(usImport, ug, {
      idPrefix: "winner-intro-music",
      smartTempoAudio: {
        assetId: "a1",
        durationMs,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: 0,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: 120,
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const BAR = 3840;
    const intro = r.formaMusic.clips.find((c) => c.name === "Intro")!;
    const verse = r.formaMusic.clips.find((c) => c.name === "Verse")!;
    const chorus = r.formaMusic.clips.find((c) => c.name === "Chorus")!;
    expect(verse.startTicks).toBe(17 * BAR);
    expect(intro.lengthTicks).toBe(verse.startTicks);
    expect(chorus.startTicks).toBe(verse.startTicks + verse.lengthTicks);

    const firstVocal = r.tekst.clips[0]!;
    const gapTicks = Math.round((gapMs / 1000) * (120 / 60) * 960);
    expect(firstVocal.startTicks).toBeGreaterThanOrEqual(gapTicks - BAR);
    expect(firstVocal.startTicks).toBeLessThanOrEqual(gapTicks + BAR);
    expect(firstVocal.startTicks).toBeLessThan(verse.startTicks);
    expect(firstVocal.startTicks).toBeGreaterThanOrEqual(
      verse.startTicks - BAR,
    );
  });

  it("winner-intro-vc: does not rewrite Audio Start Offset via chord↔syllable lock", () => {
    const { us, ug } = loadPair("winner-intro-vc");
    const usImport = importUltrastarText(us);
    expect(usImport.ok).toBe(true);
    if (!usImport.ok) return;

    const durationMs = 180_000;
    const lateOffsetMs = 2_000;
    const beatMs = Array.from(
      { length: 400 },
      (_, i) => lateOffsetMs + i * 500,
    );

    const r = bridgeUsUgImport(usImport, ug, {
      idPrefix: "winner-align",
      smartTempoAudio: {
        assetId: "a1",
        durationMs,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: lateOffsetMs,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: 120,
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    // Text = US wall-clock; Adapt offset stays as provided (no chord lock rewrite).
    expect(r.smartTempoAudio?.audioStartOffsetMs).toBe(lateOffsetMs);

    const chorus = r.formaMusic.clips.find((c) => c.name === "Chorus")!;
    const winnerLine = r.tekst.clips.find((c) => /winner takes/i.test(c.text));
    expect(winnerLine).toBeTruthy();
    expect(winnerLine!.startTicks).toBeGreaterThanOrEqual(
      chorus.startTicks - 3840,
    );
  });

  it("Smart Tempo seed ignores UltraStar metro when audio analysis is present", () => {
    const { ug } = loadPair("winner-intro-vc");
    const usImport = importUltrastarText(
      `#TITLE:T\n#ARTIST:A\n#BPM:480\n#GAP:33000\n: 0 4 0 I \n: 5 4 0 don’t \n- 20\n: 40 4 0 The \n: 45 4 0 win \nE\n`,
    );
    expect(usImport.ok).toBe(true);
    if (!usImport.ok) return;
    const beatMs = Array.from({ length: 200 }, (_, i) => i * 500);
    const r = bridgeUsUgImport(usImport, ug, {
      smartTempoAudio: {
        assetId: "a1",
        durationMs: 100_000,
        peaks: [0.1],
        audioStartOffsetMs: 0,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: 120,
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.seedBpm).toBeCloseTo(120, 0);
    expect(r.ultrastarMetronomeBpm).toBe(120);
    expect(r.formaMusic.clips.length).toBeGreaterThanOrEqual(2);
  });

  it("winner-intro-vc: manual Audio Start Offset is not overwritten by chord lock", () => {
    const { us, ug } = loadPair("winner-intro-vc");
    const usImport = importUltrastarText(us);
    expect(usImport.ok).toBe(true);
    if (!usImport.ok) return;

    const durationMs = 180_000;
    // Without the user-edit flag, lock would shift 3000 → 1000 (−1 bar @ 120).
    const manualOffsetMs = 3_000;
    const beatMs = Array.from(
      { length: 400 },
      (_, i) => manualOffsetMs + i * 500,
    );

    const r = bridgeUsUgImport(usImport, ug, {
      idPrefix: "winner-manual-offset",
      smartTempoAudio: {
        assetId: "a1",
        durationMs,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: manualOffsetMs,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: 120,
      },
      audioStartOffsetUserEdited: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.smartTempoAudio?.audioStartOffsetMs).toBe(manualOffsetMs);
  });

  it("tekst keeps exact US wall-clock (no snap to audio beat grid)", () => {
    const { us, ug } = loadPair("winner-intro-vc");
    const usImport = importUltrastarText(us);
    expect(usImport.ok).toBe(true);
    if (!usImport.ok) return;

    const durationMs = 180_000;
    const offsetMs = usImport.gapMs;
    // Audio grid deliberately off US 120 BPM (500ms) so snap would skew vocals.
    const beatMs = Array.from({ length: 400 }, (_, i) => i * 480);

    const r = bridgeUsUgImport(usImport, ug, {
      idPrefix: "winner-nosnap",
      smartTempoAudio: {
        assetId: "a1",
        durationMs,
        peaks: [0.1, 0.5],
        audioStartOffsetMs: offsetMs,
      },
      audioAnalysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: 125,
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const first = r.tekst.clips[0]!;
    const blocks = first.blocks ?? [];
    expect(blocks.length).toBeGreaterThan(1);

    // First US note @ #GAP → content-epoch tick ~0 (exact ms, not nearest 480ms beat).
    expect(first.startTicks).toBeLessThan(200);

    // Second syllable: US beat spacing @ place BPM must survive (not collapse to one grid beat).
    const b0 = blocks[0]!;
    const b1 = blocks[1]!;
    expect(b1.startTicks).toBeGreaterThan(b0.startTicks);
    // At ~120 place BPM one US beat ≈ 960 ticks; allow map warp but reject snap-collapse.
    expect(b1.startTicks - b0.startTicks).toBeGreaterThan(200);
  });

  it("warns experimental when no audio", () => {
    const pair = loadPair("demo-simple");
    const us = importUltrastarText(pair.us);
    expect(us.ok).toBe(true);
    if (!us.ok) return;
    const r = bridgeUsUgImport(us, pair.ug);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings.some((w) => /eksperymentalny/i.test(w))).toBe(true);
  });
});
