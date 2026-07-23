import { describe, expect, it } from "vitest";
import {
  createProjectSeed,
  createProjectV5Seed,
  elapsedToTicks,
  type Project,
} from "@stagesync/shared";
import { addAudioTrack } from "./audioLaneEdit.js";
import { pencilAkordyClick } from "./akordyEdit.js";
import { pencilTekstClick } from "./tekstEdit.js";
import { pencilFormaClick } from "./formaCanvas.js";
import { countdownBars } from "./formaInspector.js";
import { audioLaneId } from "./timelineTracks.js";
import {
  applyTimelineNudge,
  nudgeStepTicks,
  nudgeShowsLeftEdge,
  shouldShowTouchNudge,
} from "./timelineTouchNudge.js";
import { MAX_COUNTDOWN_BARS, setCountdownBars } from "./formaInspector.js";
import {
  isDoubleTap,
  pinchZoomFromRatio,
  TOUCH_DOUBLE_TAP_MS,
} from "./timelineTouchGestures.js";

function projectWithAudio(): Project {
  let p = createProjectSeed("p1", "Song", "2026-07-21T00:00:00.000Z");
  const added = addAudioTrack(p, "Backing");
  p = added.project;
  const trackId = added.trackId;
  const assetId = "asset-1";
  return {
    ...p,
    assets: [
      {
        id: assetId,
        storageName: `${assetId}.wav`,
        originalName: "kick.wav",
        kind: "audio",
        mimeType: "audio/wav",
        sizeBytes: 100,
        durationMs: 8000,
      },
    ],
    audioClips: [
      {
        id: "clip-1",
        trackId,
        assetId,
        startTicks: 0,
        lengthTicks: elapsedToTicks(4000, 120, p.defaultMeter, p.ppq),
      },
    ],
  };
}

describe("timelineTouchNudge", () => {
  it("shows nudge for any selected lane on tablet", () => {
    const p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    const section = p.forma.clips.find((c) => c.kind === "section")!;
    expect(shouldShowTouchNudge("tablet", "forma", section.id, p)).toBe(true);
    expect(shouldShowTouchNudge("desktop", "forma", section.id, p)).toBe(false);
    expect(shouldShowTouchNudge("mobile", "forma", section.id, p)).toBe(false);
  });

  it("moves and stretches Forma section by bar", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = pencilFormaClick(p, 7680, "Verse");
    const id = p.forma.clips.find((c) => c.name === "Verse")!.id;
    const before = p.forma.clips.find((c) => c.id === id)!;
    const step = nudgeStepTicks(p, before.startTicks, "bar");

    p = applyTimelineNudge(p, "forma", id, "move-right", "bar");
    expect(p.forma.clips.find((c) => c.id === id)!.startTicks).toBe(
      before.startTicks + step,
    );

    p = applyTimelineNudge(p, "forma", id, "stretch-right-out", "bar");
    const stretched = p.forma.clips.find((c) => c.id === id)!;
    expect(stretched.lengthTicks).toBe(before.lengthTicks + step);

    p = applyTimelineNudge(p, "forma", id, "stretch-left-in", "bar");
    const trimmed = p.forma.clips.find((c) => c.id === id)!;
    expect(trimmed.startTicks).toBe(stretched.startTicks + step);
    expect(trimmed.lengthTicks).toBe(stretched.lengthTicks - step);
  });

  it("moves and trims Tekst / Akordy clips", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = pencilTekstClick(p, 0, "Hi");
    const tekstId = p.tekst.clips[0]!.id;
    const step = nudgeStepTicks(p, 0, "bar");
    p = applyTimelineNudge(p, "tekst", tekstId, "move-right", "bar");
    expect(p.tekst.clips[0]!.startTicks).toBe(step);
    p = applyTimelineNudge(p, "tekst", tekstId, "stretch-right-out", "bar");
    expect(p.tekst.clips[0]!.lengthTicks).toBeGreaterThan(step);

    p = pencilAkordyClick(p, 0, "C");
    const akId = p.akordy.clips[0]!.id;
    p = applyTimelineNudge(p, "akordy", akId, "stretch-right-out", "bar");
    const akLen = p.akordy.clips[0]!.lengthTicks;
    p = applyTimelineNudge(p, "akordy", akId, "stretch-right-in", "bar");
    expect(p.akordy.clips[0]!.lengthTicks).toBe(akLen - step);
  });

  it("moves and trims audio clip edges", () => {
    let p = projectWithAudio();
    const trackId = p.audioTracks[0]!.id;
    const lane = audioLaneId(trackId);
    const before = p.audioClips[0]!;
    const step = nudgeStepTicks(p, 0, "bar");
    p = applyTimelineNudge(p, lane, before.id, "move-right", "bar");
    expect(p.audioClips[0]!.startTicks).toBe(before.startTicks + step);
    p = applyTimelineNudge(p, lane, before.id, "stretch-right-out", "bar");
    expect(p.audioClips[0]!.lengthTicks).toBeGreaterThan(before.lengthTicks);
  });

  it("Countdown move changes length; left edge hidden", () => {
    const p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    const cd = p.forma.clips.find((c) => c.kind === "countdown")!;
    expect(nudgeShowsLeftEdge(p, "forma", cd.id)).toBe(false);
    const bars = countdownBars(p, cd);
    const next = applyTimelineNudge(p, "forma", cd.id, "move-right", "bar");
    const cdNext = next.forma.clips.find((c) => c.kind === "countdown")!;
    expect(countdownBars(next, cdNext)).toBe(bars + 1);
  });

  it("nudgeStepTicks covers beat/off/subdivision modes", () => {
    const p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    expect(nudgeStepTicks(p, 0, "beat")).toBe(960);
    expect(nudgeStepTicks(p, 0, "off")).toBe(960);
    expect(nudgeStepTicks(p, 0, { kind: "subdivision", parts: 4 })).toBe(240);
  });

  it("moves cue clips and covers left move / stretch-out", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = {
      ...p,
      cue: {
        clips: [
          {
            id: "cue-1",
            startTicks: 7680,
            lengthTicks: 3840,
            label: "Go",
            roles: [],
            priority: "normal",
          },
        ],
      },
    };
    const step = nudgeStepTicks(p, 7680, "bar");
    p = applyTimelineNudge(p, "cue", "cue-1", "move-left", "bar");
    expect(p.cue.clips[0]!.startTicks).toBe(7680 - step);
    const afterMove = p.cue.clips[0]!.startTicks;
    p = applyTimelineNudge(p, "cue", "cue-1", "stretch-left-out", "bar");
    expect(p.cue.clips[0]!.startTicks).toBeLessThan(afterMove);
    expect(p.cue.clips[0]!.lengthTicks).toBeGreaterThan(3840);
  });

  it("Countdown stretch-right changes length; unknown action no-ops", () => {
    const p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    const cd = p.forma.clips.find((c) => c.kind === "countdown")!;
    const bars = countdownBars(p, cd);
    const stretched = applyTimelineNudge(
      p,
      "forma",
      cd.id,
      "stretch-right-out",
      "bar",
    );
    expect(
      countdownBars(
        stretched,
        stretched.forma.clips.find((c) => c.kind === "countdown")!,
      ),
    ).toBe(bars + 1);
    expect(
      applyTimelineNudge(p, "forma", cd.id, "not-a-nudge" as never, "bar"),
    ).toBe(p);
  });

  it("missing clip and unknown lane are no-ops", () => {
    const p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    expect(applyTimelineNudge(p, "forma", "missing", "move-right", "bar")).toBe(
      p,
    );
    expect(nudgeShowsLeftEdge(p, "forma", "missing")).toBe(false);
    expect(
      applyTimelineNudge(p, "not-a-lane" as never, "x", "move-right", "bar"),
    ).toBe(p);
  });

  it("Countdown at max bars move-right is a no-op", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = setCountdownBars(p, MAX_COUNTDOWN_BARS);
    const cd = p.forma.clips.find((c) => c.kind === "countdown")!;
    expect(applyTimelineNudge(p, "forma", cd.id, "move-right", "bar")).toEqual(
      p,
    );
  });
});

describe("timelineTouchGestures", () => {
  it("detects double-tap within 300ms same spot", () => {
    const t0 = 1000;
    expect(
      isDoubleTap({ time: t0, x: 10, y: 10 }, t0 + TOUCH_DOUBLE_TAP_MS - 1, 12, 11),
    ).toBe(true);
    expect(
      isDoubleTap({ time: t0, x: 10, y: 10 }, t0 + TOUCH_DOUBLE_TAP_MS + 1, 12, 11),
    ).toBe(false);
  });

  it("scales pinch zoom from ratio", () => {
    expect(pinchZoomFromRatio(40, 2, 24, 200)).toBe(80);
    expect(pinchZoomFromRatio(40, 0.1, 24, 200)).toBe(24);
  });
});
