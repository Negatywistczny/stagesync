import { describe, expect, it } from "vitest";
import {
  createProjectSeed,
  elapsedToTicks,
  type Project,
} from "@stagesync/shared";
import {
  addAudioTrack,
  applyAbutCrossfadeForClip,
  applyDecodedAudioMeta,
  audioAsForma,
  commitAudioGesture,
  commitMoveAudioClip,
  commitMoveAudioClips,
  commitResizeAudioClip,
  deleteAudioClip,
  duplicateAudioTrack,
  MAX_AUDIO_TRACKS,
  previewAudioFromSession,
  removeAudioTrack,
  setAudioClipFadeMs,
  setAudioClipGainDb,
  setAudioClipLoop,
  setAudioClipMuted,
  setAudioClipTrimMs,
  setAudioTrackGainDb,
  setAudioTrackMuted,
  setAudioTracksMuted,
  setAudioTrackName,
} from "./audioLaneEdit.js";
import { audioLaneId } from "./timelineTracks.js";
import type {
  FormaGesturePreview,
  FormaGestureSession,
} from "./timelineGesture.js";

function projectWithAudio(): Project {
  let p = createProjectSeed("p1", "Song", "2026-07-21T00:00:00.000Z");
  const added = addAudioTrack(p, "Backing");
  p = added.project;
  const trackId = added.trackId;
  const assetId = "asset-1";
  const lengthTicks = elapsedToTicks(4000, 120, p.defaultMeter, p.ppq);
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
        durationMs: 4000,
      },
    ],
    audioClips: [
      {
        id: "clip-1",
        trackId,
        assetId,
        startTicks: 0,
        lengthTicks,
      },
    ],
  };
}

function abutProject(): Project {
  const p = projectWithAudio();
  const trackId = p.audioTracks[0]!.id;
  const len = p.audioClips[0]!.lengthTicks;
  return {
    ...p,
    audioClips: [
      { ...p.audioClips[0]!, id: "left", startTicks: 0, lengthTicks: len },
      {
        id: "right",
        trackId,
        assetId: "asset-1",
        startTicks: len,
        lengthTicks: len,
      },
    ],
  };
}

function baseSession(
  overrides: Partial<FormaGestureSession> &
    Pick<FormaGestureSession, "kind">,
): FormaGestureSession {
  return {
    clipId: "clip-1",
    pointerId: 1,
    originTicks: 0,
    originClipStart: 0,
    originClipLength: 3840,
    ...overrides,
  };
}

describe("audioLaneEdit", () => {
  it("audioAsForma maps clips", () => {
    const p = projectWithAudio();
    expect(audioAsForma(p.audioClips)).toEqual([
      {
        id: "clip-1",
        name: "clip-1",
        kind: "section",
        startTicks: 0,
        lengthTicks: p.audioClips[0]!.lengthTicks,
      },
    ]);
  });

  it("moves clip on lane", () => {
    const p = projectWithAudio();
    const trackId = p.audioTracks[0]!.id;
    const next = commitMoveAudioClip(p, trackId, "clip-1", 3840, "bar");
    expect(next.audioClips[0]!.id).toBe("clip-1");
    expect(next.audioClips[0]!.startTicks).toBeGreaterThanOrEqual(0);
  });

  it("commitMoveAudioClips single and multi + no-op paths", () => {
    const p0 = projectWithAudio();
    const trackId = p0.audioTracks[0]!.id;
    const len = p0.audioClips[0]!.lengthTicks;
    const p: Project = {
      ...p0,
      audioClips: [
        { ...p0.audioClips[0]!, id: "a", startTicks: 0, lengthTicks: len },
        {
          id: "b",
          trackId,
          assetId: "asset-1",
          startTicks: len + 3840,
          lengthTicks: len,
        },
      ],
    };
    // length <= 1 delegates to single move
    const single = commitMoveAudioClips(p, trackId, ["a"], "a", 3840, "bar");
    expect(single.audioClips.find((c) => c.id === "a")!.startTicks).toBe(3840);

    // missing primary
    expect(
      commitMoveAudioClips(p, trackId, ["a", "b"], "missing", 100, "off"),
    ).toBe(p);

    // delta 0
    expect(
      commitMoveAudioClips(p, trackId, ["a", "b"], "a", 0, "off"),
    ).toBe(p);

    const moved = commitMoveAudioClips(
      p,
      trackId,
      ["a", "b"],
      "a",
      7680,
      "bar",
    );
    const a = moved.audioClips.find((c) => c.id === "a")!;
    const b = moved.audioClips.find((c) => c.id === "b")!;
    expect(a.startTicks).toBe(7680);
    expect(b.startTicks - a.startTicks).toBe(len + 3840);
  });

  it("trim end sets trimOutMs; resize start; missing clip no-op", () => {
    const p = projectWithAudio();
    const trackId = p.audioTracks[0]!.id;
    const clip = p.audioClips[0]!;
    const mid = clip.startTicks + Math.floor(clip.lengthTicks / 2);
    const next = commitResizeAudioClip(p, trackId, "clip-1", "end", mid, "off");
    expect(next.audioClips[0]!.lengthTicks).toBeLessThan(clip.lengthTicks);
    expect((next.audioClips[0]!.trimOutMs ?? 0) > 0).toBe(true);

    const startResized = commitResizeAudioClip(
      p,
      trackId,
      "clip-1",
      "start",
      mid,
      "off",
    );
    expect(startResized.audioClips[0]!.startTicks).toBeGreaterThan(0);

    expect(
      commitResizeAudioClip(p, trackId, "nope", "end", mid, "off"),
    ).toBe(p);

    // floor clamp: countdown ends after clip start; resize-end keeps start < floor
    const highFloor: Project = {
      ...p,
      forma: {
        clips: [
          {
            id: "forma-cd",
            name: "Countdown",
            kind: "countdown",
            startTicks: 0,
            lengthTicks: 3840,
          },
          {
            id: "forma-intro",
            name: "Intro",
            kind: "section",
            startTicks: 3840,
            lengthTicks: 7680,
          },
        ],
      },
      audioClips: [
        {
          ...clip,
          startTicks: 0,
          lengthTicks: clip.lengthTicks,
        },
      ],
    };
    const floored = commitResizeAudioClip(
      highFloor,
      trackId,
      "clip-1",
      "end",
      mid,
      "off",
    );
    expect(floored.audioClips[0]!.startTicks).toBe(3840);
  });

  it("clip/track mutators cover gain fade loop trim edges", () => {
    let p = projectWithAudio();
    const trackId = p.audioTracks[0]!.id;

    p = setAudioClipMuted(p, "clip-1", true);
    expect(p.audioClips[0]!.muted).toBe(true);
    p = setAudioClipMuted(p, "clip-1", false);
    expect(p.audioClips[0]!.muted).toBeUndefined();

    p = setAudioClipGainDb(p, "clip-1", -6);
    expect(p.audioClips[0]!.gainDb).toBe(-6);

    p = setAudioClipFadeMs(p, "clip-1", { fadeInMs: 50, fadeOutMs: 60 });
    expect(p.audioClips[0]!).toMatchObject({ fadeInMs: 50, fadeOutMs: 60 });
    p = setAudioClipFadeMs(p, "clip-1", { fadeInMs: 0, fadeOutMs: 0 });
    expect(p.audioClips[0]!.fadeInMs).toBeUndefined();
    expect(p.audioClips[0]!.fadeOutMs).toBeUndefined();
    // undefined keys preserve previous
    p = setAudioClipFadeMs(p, "clip-1", { fadeInMs: 10 });
    p = setAudioClipFadeMs(p, "clip-1", { fadeOutMs: 20 });
    expect(p.audioClips[0]!).toMatchObject({ fadeInMs: 10, fadeOutMs: 20 });
    p = setAudioClipFadeMs(p, "other", { fadeInMs: 1 });
    expect(p.audioClips[0]!.fadeInMs).toBe(10);

    p = setAudioClipLoop(p, "clip-1", true);
    expect(p.audioClips[0]!.loop).toBe(true);
    p = setAudioClipLoop(p, "clip-1", false);
    expect(p.audioClips[0]!.loop).toBeUndefined();

    p = setAudioClipTrimMs(p, "clip-1", { trimInMs: 120, trimOutMs: 80 });
    expect(p.audioClips[0]!.trimInMs).toBe(120);
    expect(p.audioClips[0]!.trimOutMs).toBe(80);
    p = setAudioClipTrimMs(p, "clip-1", { trimInMs: 0 });
    expect(p.audioClips[0]!.trimInMs).toBeUndefined();
    p = setAudioClipTrimMs(p, "clip-1", { trimOutMs: 0 });
    expect(p.audioClips[0]!.trimOutMs).toBeUndefined();
    p = setAudioClipTrimMs(p, "clip-1", { trimInMs: 5 });
    p = setAudioClipTrimMs(p, "clip-1", {});
    expect(p.audioClips[0]!.trimInMs).toBe(5);
    p = setAudioClipTrimMs(p, "other", { trimInMs: 1 });
    expect(p.audioClips[0]!.trimInMs).toBe(5);

    p = setAudioTrackMuted(p, trackId, true);
    expect(p.audioTracks[0]!.muted).toBe(true);
    p = setAudioTrackMuted(p, trackId, false);
    expect(p.audioTracks[0]!.muted).toBeUndefined();

    const second = addAudioTrack(p, "B");
    p = second.project;
    p = setAudioTracksMuted(p, [trackId, second.trackId], true);
    expect(p.audioTracks.every((t) => t.muted === true)).toBe(true);
    p = setAudioTracksMuted(p, [trackId, second.trackId], false);
    expect(p.audioTracks.every((t) => t.muted === undefined)).toBe(true);

    p = setAudioTrackGainDb(p, trackId, -3);
    expect(p.audioTracks[0]!.gainDb).toBe(-3);

    p = setAudioTrackName(p, trackId, "  Lead  ");
    expect(p.audioTracks[0]!.name).toBe("Lead");
    expect(setAudioTrackName(p, trackId, "   ")).toBe(p);

    p = deleteAudioClip(p, "clip-1");
    expect(p.audioClips).toHaveLength(0);
    expect(deleteAudioClip(p, "clip-1")).toBe(p);
  });

  it("applyAbutCrossfadeForClip applies and no-ops", () => {
    const p0 = abutProject();
    // third clip on another track → map fallthrough `return c`
    const other = addAudioTrack(p0, "Other");
    const p: Project = {
      ...other.project,
      audioClips: [
        ...p0.audioClips,
        {
          id: "other-clip",
          trackId: other.trackId,
          assetId: "asset-1",
          startTicks: 0,
          lengthTicks: 100,
        },
      ],
    };
    const applied = applyAbutCrossfadeForClip(p, "left", 80);
    expect(applied).not.toBe(p);
    expect(applied.audioClips.find((c) => c.id === "left")!.fadeOutMs).toBeGreaterThan(0);
    expect(applied.audioClips.find((c) => c.id === "right")!.fadeInMs).toBeGreaterThan(0);
    expect(applied.audioClips.find((c) => c.id === "other-clip")).toEqual(
      p.audioClips.find((c) => c.id === "other-clip"),
    );

    expect(applyAbutCrossfadeForClip(p, "missing")).toBe(p);

    const gap: Project = {
      ...p,
      audioClips: [
        p.audioClips[0]!,
        { ...p.audioClips[1]!, startTicks: p.audioClips[1]!.startTicks + 100 },
        p.audioClips[2]!,
      ],
    };
    expect(applyAbutCrossfadeForClip(gap, "left")).toBe(gap);

    // zero crossfade → applyAbutCrossfade returns null
    expect(applyAbutCrossfadeForClip(p, "left", 0)).toBe(p);
  });

  it("applyDecodedAudioMeta stamps peaks and skips non-matching", () => {
    let p = projectWithAudio();
    p = {
      ...p,
      assets: p.assets.map((a) => ({ ...a, durationMs: undefined })),
      audioClips: [
        ...p.audioClips.map((c) => ({ ...c, lengthTicks: 7680 })),
        {
          id: "other",
          trackId: p.audioTracks[0]!.id,
          assetId: "other-asset",
          startTicks: 10000,
          lengthTicks: 100,
        },
      ],
    };
    const next = applyDecodedAudioMeta(p, "asset-1", {
      durationMs: 2000,
      waveformPeaks: [0.1, 0.5, 0.2],
      waveformRms: 0.3,
    });
    expect(next.assets[0]!.durationMs).toBe(2000);
    expect(next.assets[0]!.waveformPeaks).toEqual([0.1, 0.5, 0.2]);
    expect(next.audioClips[0]!.lengthTicks).toBe(
      elapsedToTicks(2000, 120, p.defaultMeter, p.ppq),
    );
    expect(next.audioClips.find((c) => c.id === "other")!.lengthTicks).toBe(100);

    // missing duration after map → early return with assets only
    const noDur = applyDecodedAudioMeta(p, "missing-asset", {
      durationMs: 0,
    });
    expect(noDur.assets).toEqual(p.assets);
  });

  it("addAudioTrack rejects above MAX_AUDIO_TRACKS; default name", () => {
    let p = createProjectSeed("p1", "Song", "2026-07-21T00:00:00.000Z");
    const first = addAudioTrack(p);
    expect(first.project.audioTracks[0]!.name).toBe("Audio 1");
    p = addAudioTrack(p, "  Named  ").project;
    expect(p.audioTracks[0]!.name).toBe("Named");
    for (let i = p.audioTracks.length; i < MAX_AUDIO_TRACKS; i++) {
      p = addAudioTrack(p).project;
    }
    expect(p.audioTracks).toHaveLength(MAX_AUDIO_TRACKS);
    expect(() => addAudioTrack(p)).toThrow(RangeError);
  });

  it("removeAudioTrack drops track and its clips; no-op missing", () => {
    const p0 = projectWithAudio();
    const trackId = p0.audioTracks[0]!.id;
    const other = addAudioTrack(p0, "Other").project;
    const withBoth = {
      ...other,
      audioClips: [
        ...other.audioClips,
        {
          ...other.audioClips[0]!,
          id: "clip-other",
          trackId: other.audioTracks[1]!.id,
        },
      ],
    };
    const next = removeAudioTrack(withBoth, trackId);
    expect(next.audioTracks.map((t) => t.id)).toEqual([
      other.audioTracks[1]!.id,
    ]);
    expect(next.audioClips.map((c) => c.id)).toEqual(["clip-other"]);
    expect(removeAudioTrack(p0, "missing")).toBe(p0);
  });

  it("duplicateAudioTrack clones track+clips with new ids", () => {
    const p0 = projectWithAudio();
    const srcId = p0.audioTracks[0]!.id;
    const dup = duplicateAudioTrack(p0, srcId);
    expect(dup).not.toBeNull();
    expect(dup!.trackId).not.toBe(srcId);
    expect(dup!.project.audioTracks).toHaveLength(2);
    expect(dup!.project.audioTracks[1]!.id).toBe(dup!.trackId);
    expect(dup!.project.audioTracks[1]!.name).toBe("Backing (kopia)");
    expect(dup!.project.audioClips).toHaveLength(2);
    const clone = dup!.project.audioClips.find(
      (c) => c.trackId === dup!.trackId,
    )!;
    expect(clone.id).not.toBe("clip-1");
    expect(clone.assetId).toBe(p0.audioClips[0]!.assetId);
    expect(clone.startTicks).toBe(p0.audioClips[0]!.startTicks);
    expect(duplicateAudioTrack(p0, "missing")).toBeNull();
  });

  it("commitAudioGesture covers move/resize/fade and guards", () => {
    const p = projectWithAudio();
    const lane = audioLaneId(p.audioTracks[0]!.id);
    const preview: FormaGesturePreview = {
      kind: "move",
      clipId: "clip-1",
      startTicks: 3840,
      lengthTicks: p.audioClips[0]!.lengthTicks,
    };

    // invalid lane type cast
    expect(
      commitAudioGesture(
        p,
        "forma" as ReturnType<typeof audioLaneId>,
        baseSession({ kind: "move" }),
        preview,
        false,
        false,
      ),
    ).toBe(p);

    expect(
      commitAudioGesture(
        p,
        lane,
        baseSession({ kind: "move", clipId: null }),
        preview,
        false,
        false,
      ),
    ).toBe(p);

    const moved = commitAudioGesture(
      p,
      lane,
      baseSession({ kind: "move" }),
      preview,
      false,
      false,
    );
    expect(moved.audioClips[0]!.startTicks).toBe(3840);

    const multiP = abutProject();
    const multiLane = audioLaneId(multiP.audioTracks[0]!.id);
    const multiMoved = commitAudioGesture(
      multiP,
      multiLane,
      baseSession({
        kind: "move",
        clipId: "left",
        moveIds: ["left", "right"],
        originClipStart: 0,
        originClipLength: multiP.audioClips[0]!.lengthTicks,
      }),
      {
        kind: "move",
        clipId: "left",
        startTicks: 3840,
        lengthTicks: multiP.audioClips[0]!.lengthTicks,
      },
      false,
      false,
    );
    expect(multiMoved.audioClips.find((c) => c.id === "left")!.startTicks).toBe(
      3840,
    );

    expect(
      commitAudioGesture(
        p,
        lane,
        baseSession({ kind: "resize-start", clipId: null }),
        preview,
        false,
        false,
      ),
    ).toBe(p);
    const resizedStart = commitAudioGesture(
      p,
      lane,
      baseSession({ kind: "resize-start" }),
      {
        kind: "resize-start",
        clipId: "clip-1",
        startTicks: 960,
        lengthTicks: p.audioClips[0]!.lengthTicks - 960,
      },
      true,
      false,
    );
    expect(resizedStart.audioClips[0]!.startTicks).toBe(960);

    expect(
      commitAudioGesture(
        p,
        lane,
        baseSession({ kind: "resize-end", clipId: null }),
        preview,
        false,
        false,
      ),
    ).toBe(p);
    const resizedEnd = commitAudioGesture(
      p,
      lane,
      baseSession({ kind: "resize-end" }),
      {
        kind: "resize-end",
        clipId: "clip-1",
        startTicks: 0,
        lengthTicks: Math.floor(p.audioClips[0]!.lengthTicks / 2),
      },
      false,
      false,
    );
    expect(resizedEnd.audioClips[0]!.lengthTicks).toBeLessThan(
      p.audioClips[0]!.lengthTicks,
    );

    expect(
      commitAudioGesture(
        p,
        lane,
        baseSession({ kind: "fade-in", clipId: null }),
        { ...preview, fadeInMs: 40 },
        false,
        false,
      ),
    ).toBe(p);
    expect(
      commitAudioGesture(
        p,
        lane,
        baseSession({ kind: "fade-in" }),
        { ...preview, fadeInMs: undefined },
        false,
        false,
      ),
    ).toBe(p);
    const fadedIn = commitAudioGesture(
      p,
      lane,
      baseSession({ kind: "fade-in" }),
      { ...preview, fadeInMs: 40 },
      false,
      false,
    );
    expect(fadedIn.audioClips[0]!.fadeInMs).toBe(40);

    expect(
      commitAudioGesture(
        p,
        lane,
        baseSession({ kind: "fade-out", clipId: null }),
        { ...preview, fadeOutMs: 40 },
        false,
        false,
      ),
    ).toBe(p);
    expect(
      commitAudioGesture(
        p,
        lane,
        baseSession({ kind: "fade-out" }),
        { ...preview, fadeOutMs: undefined },
        false,
        false,
      ),
    ).toBe(p);
    const fadedOut = commitAudioGesture(
      p,
      lane,
      baseSession({ kind: "fade-out" }),
      { ...preview, fadeOutMs: 55 },
      false,
      false,
    );
    expect(fadedOut.audioClips[0]!.fadeOutMs).toBe(55);

    expect(
      commitAudioGesture(
        p,
        lane,
        baseSession({ kind: "pencil-draw" }),
        preview,
        false,
        false,
      ),
    ).toBe(p);
  });

  it("previewAudioFromSession covers fade/move/resize branches", () => {
    const p = projectWithAudio();
    const len = p.audioClips[0]!.lengthTicks;

    const missingFade = previewAudioFromSession(
      p,
      baseSession({ kind: "fade-in", clipId: "missing" }),
      100,
      false,
      false,
    );
    expect(missingFade.clipId).toBe("missing");

    const fadeIn = previewAudioFromSession(
      p,
      baseSession({ kind: "fade-in", originClipStart: 0, originClipLength: len }),
      Math.floor(len / 4),
      false,
      false,
    );
    expect(fadeIn.kind).toBe("fade-in");
    expect(fadeIn.fadeInMs).toBeGreaterThan(0);

    const fadeOut = previewAudioFromSession(
      p,
      baseSession({
        kind: "fade-out",
        originClipStart: 0,
        originClipLength: len,
      }),
      Math.floor((len * 3) / 4),
      false,
      false,
    );
    expect(fadeOut.kind).toBe("fade-out");
    expect(fadeOut.fadeOutMs).toBeGreaterThan(0);

    const move = previewAudioFromSession(
      p,
      baseSession({
        kind: "move",
        originTicks: 0,
        originClipStart: 0,
        originClipLength: len,
      }),
      3840,
      false,
      false,
    );
    expect(move.kind).toBe("move");
    expect(move.startTicks).toBe(3840);

    const resizeStart = previewAudioFromSession(
      p,
      baseSession({
        kind: "resize-start",
        originClipStart: 0,
        originClipLength: len,
      }),
      960,
      true,
      false,
    );
    expect(resizeStart.kind).toBe("resize-start");
    expect(resizeStart.startTicks).toBe(960);

    // clamp when start would pass end
    const clampStart = previewAudioFromSession(
      p,
      baseSession({
        kind: "resize-start",
        originClipStart: 0,
        originClipLength: 10,
      }),
      10_000,
      true,
      false,
    );
    expect(clampStart.lengthTicks).toBe(1);

    const resizeEnd = previewAudioFromSession(
      p,
      baseSession({
        kind: "resize-end",
        originClipStart: 0,
        originClipLength: len,
      }),
      Math.floor(len / 2),
      true,
      false,
    );
    expect(resizeEnd.kind).toBe("resize-end");
    expect(resizeEnd.lengthTicks).toBe(Math.floor(len / 2));

    const clampEnd = previewAudioFromSession(
      p,
      baseSession({
        kind: "resize-end",
        originClipStart: 100,
        originClipLength: len,
      }),
      50,
      true,
      false,
    );
    expect(clampEnd.lengthTicks).toBe(1);
  });
});
