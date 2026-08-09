import { describe, expect, it } from "vitest";
import {
  createProjectSeed,
  elapsedToTicks,
  ticksToMs,
  ticksToMsAlongTempoMap,
  MAX_AUDIO_BUSSES,
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
  placeImportedAudioClipAt,
  previewAudioFromSession,
  removeAudioTrack,
  setAudioClipFadeMs,
  setAudioClipGainDb,
  setAudioClipLoop,
  setAudioClipMuted,
  setAudioClipTrimMs,
  setAudioTrackColor,
  setAudioTrackGainDb,
  setAudioTrackIcon,
  setAudioTrackOutput,
  setAudioTrackMuted,
  setAudioTrackPan,
  setAudioTrackChannelMode,
  setAudioTracksMuted,
  setAudioTrackName,
  addAudioBus,
  setAudioBusName,
  setAudioBusMuted,
  setAudioBusChannelMode,
  setAudioBusPan,
  setAudioBusGainDb,
  setAudioBusOutput,
  removeAudioBus,
  setMasterGainDb,
  splitAudioClipAt,
  joinAdjacentAudioClips,
  toggleAudioClipMute,
  gainDbFromPointerDelta,
  GAIN_TOOL_DB_PER_PX,
} from "./audioLaneEdit.js";
import { audioLaneId } from "@lib/timeline/timelineTracks.js";
import type {
  FormaGesturePreview,
  FormaGestureSession,
} from "@lib/timeline/timelineGesture.js";

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
  overrides: Partial<FormaGestureSession> & Pick<FormaGestureSession, "kind">,
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
    expect(commitMoveAudioClips(p, trackId, ["a", "b"], "a", 0, "off")).toBe(p);

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

    expect(commitResizeAudioClip(p, trackId, "nope", "end", mid, "off")).toBe(
      p,
    );

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

    p = setAudioTrackPan(p, trackId, -0.5);
    expect(p.audioTracks[0]!.pan).toBe(-0.5);
    p = setAudioTrackPan(p, trackId, 0);
    expect(p.audioTracks[0]!.pan).toBeUndefined();

    expect(p.audioTracks[0]!.channelMode).toBe("stereo");
    p = setAudioTrackChannelMode(p, trackId, "mono");
    expect(p.audioTracks[0]!.channelMode).toBe("mono");
    p = setAudioTrackChannelMode(p, trackId, "stereo");
    expect(p.audioTracks[0]!.channelMode).toBeUndefined();

    p = setMasterGainDb(p, -6);
    expect(p.masterGainDb).toBe(-6);
    p = setMasterGainDb(p, 0);
    expect(p.masterGainDb).toBeUndefined();

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
    expect(
      applied.audioClips.find((c) => c.id === "left")!.fadeOutMs,
    ).toBeGreaterThan(0);
    expect(
      applied.audioClips.find((c) => c.id === "right")!.fadeInMs,
    ).toBeGreaterThan(0);
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

  it("placeImportedAudioClipAt moves clip to click ticks with duration", () => {
    const p = projectWithAudio();
    const clip = p.audioClips[0]!;
    const at = elapsedToTicks(2000, 120, p.defaultMeter, p.ppq);
    const next = placeImportedAudioClipAt(p, clip.id, at, {
      durationMs: 1000,
    });
    const placed = next.audioClips.find((c) => c.id === clip.id)!;
    expect(placed.startTicks).toBe(at);
    expect(placed.lengthTicks).toBe(
      elapsedToTicks(1000, 120, p.defaultMeter, p.ppq),
    );
    expect(next.assets[0]!.durationMs).toBe(1000);
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
    expect(next.audioClips.find((c) => c.id === "other")!.lengthTicks).toBe(
      100,
    );

    // Mono file on a track with unset channelMode → stamp mono
    const unset = {
      ...p,
      audioTracks: p.audioTracks.map((t) => {
        const { channelMode: _drop, ...rest } = t;
        void _drop;
        return rest;
      }),
    };
    const withMode = applyDecodedAudioMeta(unset, "asset-1", {
      durationMs: 2000,
      channelCount: 1,
    });
    expect(withMode.audioTracks[0]!.channelMode).toBe("mono");
    // Already set (incl. explicit "stereo" string) is left alone
    const keepStereo = applyDecodedAudioMeta(
      {
        ...unset,
        audioTracks: unset.audioTracks.map((t) => ({
          ...t,
          channelMode: "stereo" as const,
        })),
      },
      "asset-1",
      { durationMs: 2000, channelCount: 1 },
    );
    expect(keepStereo.audioTracks[0]!.channelMode).toBe("stereo");

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
    expect(first.project.audioTracks[0]!.color).toBeTruthy();
    expect(first.project.audioTracks[0]!.icon).toBe("mic");
    p = addAudioTrack(p, "  Named  ").project;
    expect(p.audioTracks[0]!.name).toBe("Named");
    for (let i = p.audioTracks.length; i < MAX_AUDIO_TRACKS; i++) {
      p = addAudioTrack(p).project;
    }
    expect(p.audioTracks).toHaveLength(MAX_AUDIO_TRACKS);
    expect(() => addAudioTrack(p)).toThrow(RangeError);
  });

  it("setAudioTrackColor / setAudioTrackIcon persist closed palette", () => {
    let p = createProjectSeed("p1", "Song", "2026-07-21T00:00:00.000Z");
    const { project, trackId } = addAudioTrack(p, "Vox");
    p = setAudioTrackColor(project, trackId, "#E74C3C");
    expect(p.audioTracks[0]!.color).toBe("#E74C3C");
    p = setAudioTrackIcon(p, trackId, "vocal");
    expect(p.audioTracks[0]!.icon).toBe("vocal");
  });

  it("addAudioBus / route track / removeAudioBus reassigns to Master", () => {
    let p = createProjectSeed("p1", "Song", "2026-07-21T00:00:00.000Z");
    const track = addAudioTrack(p, "Gtr");
    p = track.project;
    const bus = addAudioBus(p);
    p = bus.project;
    expect(p.audioBusses).toHaveLength(1);
    expect(p.audioBusses![0]!.name).toBe("Bus 1");
    p = setAudioTrackOutput(p, track.trackId, {
      kind: "bus",
      busId: bus.busId,
    });
    expect(p.audioTracks[0]!.output).toEqual({
      kind: "bus",
      busId: bus.busId,
    });
    p = removeAudioBus(p, bus.busId);
    expect(p.audioBusses ?? []).toHaveLength(0);
    expect(p.audioTracks[0]!.output).toBeUndefined();
  });

  it("setAudioBusOutput allows DAG and rejects cycles", () => {
    let p = createProjectSeed("p1", "Song", "2026-07-21T00:00:00.000Z");
    const a = addAudioBus(p, "A");
    p = a.project;
    const b = addAudioBus(p, "B");
    p = b.project;
    p = setAudioBusOutput(p, a.busId, { kind: "bus", busId: b.busId });
    expect(p.audioBusses!.find((x) => x.id === a.busId)!.output).toEqual({
      kind: "bus",
      busId: b.busId,
    });
    const cycled = setAudioBusOutput(p, b.busId, {
      kind: "bus",
      busId: a.busId,
    });
    expect(
      cycled.audioBusses!.find((x) => x.id === b.busId)!.output,
    ).toBeUndefined();
    p = removeAudioBus(p, b.busId);
    expect(
      p.audioBusses!.find((x) => x.id === a.busId)!.output,
    ).toBeUndefined();
  });

  it("setAudioBusOutput rejects A→B→C→A cycle", () => {
    let p = createProjectSeed("p1", "Song", "2026-07-21T00:00:00.000Z");
    const a = addAudioBus(p, "A");
    p = a.project;
    const b = addAudioBus(p, "B");
    p = b.project;
    const c = addAudioBus(p, "C");
    p = c.project;
    p = setAudioBusOutput(p, a.busId, { kind: "bus", busId: b.busId });
    p = setAudioBusOutput(p, b.busId, { kind: "bus", busId: c.busId });
    const cycled = setAudioBusOutput(p, c.busId, {
      kind: "bus",
      busId: a.busId,
    });
    expect(
      cycled.audioBusses!.find((x) => x.id === c.busId)!.output,
    ).toBeUndefined();
  });

  it("addAudioBus throws RangeError at MAX_AUDIO_BUSSES", () => {
    let p = createProjectSeed("p1", "Song", "2026-07-21T00:00:00.000Z");
    for (let i = 0; i < MAX_AUDIO_BUSSES; i++) {
      const added = addAudioBus(p, `Bus ${i + 1}`);
      p = added.project;
    }
    expect(p.audioBusses).toHaveLength(MAX_AUDIO_BUSSES);
    expect(() => addAudioBus(p, "overflow")).toThrow(RangeError);
  });

  it("setAudioTrackOutput ignores stale bus and hw ids", () => {
    let p = createProjectSeed("p1", "Song", "2026-07-21T00:00:00.000Z");
    const track = addAudioTrack(p, "Gtr");
    p = track.project;
    const staleBus = setAudioTrackOutput(p, track.trackId, {
      kind: "bus",
      busId: "missing-bus",
    });
    expect(staleBus.audioTracks[0]!.output).toBeUndefined();
    const staleHw = setAudioTrackOutput(p, track.trackId, {
      kind: "hw_out",
      hwOutputId: "missing-hw",
    });
    expect(staleHw.audioTracks[0]!.output).toBeUndefined();
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
  });

  it("moves audio clip to a different track when targetLane is specified", () => {
    const p = projectWithAudio();
    const track2Res = addAudioTrack(p, "Track 2");
    const projectWith2Tracks = track2Res.project;
    const sourceLane = audioLaneId(projectWith2Tracks.audioTracks[0]!.id);
    const targetLane = audioLaneId(track2Res.trackId);

    const session: FormaGestureSession = {
      kind: "move",
      clipId: "clip-1",
      pointerId: 1,
      originTicks: 0,
      originClipStart: 0,
      originClipLength: 7680,
      lane: sourceLane,
      originClientX: 100,
    };

    const preview = previewAudioFromSession(
      projectWith2Tracks,
      session,
      3840,
      false,
      false,
      150,
      targetLane,
    );

    expect(preview.targetLane).toBe(targetLane);

    const moved = commitAudioGesture(
      projectWith2Tracks,
      sourceLane,
      session,
      preview,
      false,
      false,
      targetLane,
    );

    const clip = moved.audioClips.find((c) => c.id === "clip-1");
    expect(clip).toBeDefined();
    expect(clip!.trackId).toBe(track2Res.trackId);
    expect(clip!.startTicks).toBe(3840);
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
      baseSession({
        kind: "fade-in",
        originClipStart: 0,
        originClipLength: len,
      }),
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

describe("split / join / mute / gain tools", () => {
  it("splitAudioClipAt halves a clip and preserves source trims", () => {
    const p = projectWithAudio();
    const clip = p.audioClips[0]!;
    const mid = clip.startTicks + Math.floor(clip.lengthTicks / 2);
    const next = splitAudioClipAt(p, clip.id, mid);
    expect(next.audioClips).toHaveLength(2);
    const [left, right] = [...next.audioClips].sort(
      (a, b) => a.startTicks - b.startTicks,
    );
    expect(left!.lengthTicks + right!.lengthTicks).toBe(clip.lengthTicks);
    expect(right!.startTicks).toBe(mid);
    expect(splitAudioClipAt(p, clip.id, clip.startTicks)).toBe(p);
    expect(splitAudioClipAt(p, "missing", mid)).toBe(p);
  });

  it("joinAdjacentAudioClips merges split halves; rejects non-contiguous", () => {
    const p = projectWithAudio();
    const clip = p.audioClips[0]!;
    const mid = clip.startTicks + Math.floor(clip.lengthTicks / 2);
    const split = splitAudioClipAt(p, clip.id, mid);
    expect(split.audioClips).toHaveLength(2);
    const joined = joinAdjacentAudioClips(split, split.audioClips[0]!.id);
    expect(joined.audioClips).toHaveLength(1);
    expect(joined.audioClips[0]!.lengthTicks).toBe(clip.lengthTicks);
    const abut = abutProject();
    expect(joinAdjacentAudioClips(abut, "left")).toBe(abut);
    expect(joinAdjacentAudioClips(p, "missing")).toBe(p);
  });

  it("joinAdjacentAudioClips rejects different assetId and source window gap", () => {
    const abut = abutProject();
    const gapAsset = {
      ...abut,
      audioClips: [
        abut.audioClips[0]!,
        {
          ...abut.audioClips[1]!,
          assetId: "asset-2",
        },
      ],
    };
    expect(joinAdjacentAudioClips(gapAsset, "left")).toBe(gapAsset);

    const gapTrim = {
      ...abut,
      audioClips: [
        abut.audioClips[0]!,
        {
          ...abut.audioClips[1]!,
          trimInMs: 500,
        },
      ],
    };
    expect(joinAdjacentAudioClips(gapTrim, "left")).toBe(gapTrim);
  });

  it("toggleAudioClipMute and gainDbFromPointerDelta", () => {
    const p = projectWithAudio();
    const muted = toggleAudioClipMute(p, "clip-1");
    expect(muted.audioClips[0]!.muted).toBe(true);
    expect(
      toggleAudioClipMute(muted, "clip-1").audioClips[0]!.muted,
    ).toBeFalsy();
    expect(gainDbFromPointerDelta(0, 100, 80)).toBeCloseTo(
      20 * GAIN_TOOL_DB_PER_PX,
    );
    expect(gainDbFromPointerDelta(0, 0, -10_000)).toBe(24);
    expect(gainDbFromPointerDelta(0, 0, 10_000)).toBe(-60);
    expect(gainDbFromPointerDelta(0, Number.NaN, 10)).toBe(0);
    expect(setAudioClipGainDb(p, "clip-1", Number.NaN)).toBe(p);
  });

  it("BUG-01/02: split+join under fractional BPM and tempoMap change", () => {
    let p = projectWithAudio();
    const clip0 = p.audioClips[0]!;
    const mid = clip0.startTicks + Math.floor(clip0.lengthTicks / 2);
    p = {
      ...p,
      defaultBpm: 117.5,
      tempoMap: [
        { id: "t0", startTicks: 0, bpm: 117.5 },
        {
          id: "t1",
          startTicks: Math.floor(clip0.lengthTicks / 3),
          bpm: 90,
        },
      ],
    };
    const clip = p.audioClips[0]!;
    const along = ticksToMsAlongTempoMap(clip.startTicks, mid, p);
    const flat = ticksToMs(mid - clip.startTicks, 117.5, p.defaultMeter, p.ppq);
    expect(Math.abs(along - flat)).toBeGreaterThan(1);
    const split = splitAudioClipAt(p, clip.id, mid);
    expect(split.audioClips).toHaveLength(2);
    const [left, right] = [...split.audioClips].sort(
      (a, b) => a.startTicks - b.startTicks,
    );
    expect(left!.startTicks + left!.lengthTicks).toBe(right!.startTicks);
    expect(right!.trimInMs ?? 0).toBeCloseTo(along, 0);
    const joined = joinAdjacentAudioClips(split, left!.id);
    expect(joined.audioClips).toHaveLength(1);
    expect(joined.audioClips[0]!.lengthTicks).toBeGreaterThan(0);
  });

  it("BUG-03: resize overlap that splits a neighbor does not throw", () => {
    const p0 = projectWithAudio();
    const trackId = p0.audioTracks[0]!.id;
    const len = p0.audioClips[0]!.lengthTicks;
    const p: Project = {
      ...p0,
      audioClips: [
        {
          ...p0.audioClips[0]!,
          id: "grow",
          startTicks: 0,
          lengthTicks: Math.floor(len / 2),
        },
        {
          id: "neighbor",
          trackId,
          assetId: "asset-1",
          startTicks: Math.floor(len / 2),
          lengthTicks: len,
        },
      ],
    };
    expect(() =>
      commitResizeAudioClip(
        p,
        trackId,
        "grow",
        "end",
        len + Math.floor(len / 4),
        "off",
      ),
    ).not.toThrow();
    const next = commitResizeAudioClip(
      p,
      trackId,
      "grow",
      "end",
      len + Math.floor(len / 4),
      "off",
    );
    expect(next.audioClips.some((c) => c.id === "grow")).toBe(true);
    expect(next.audioClips.some((c) => c.id.startsWith("neighbor"))).toBe(true);
  });

  it("BUG-05: multi-move includes primary even when omitted from moveIds", () => {
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
    const moved = commitMoveAudioClips(p, trackId, ["b"], "a", 7680, "bar");
    const a = moved.audioClips.find((c) => c.id === "a")!;
    const b = moved.audioClips.find((c) => c.id === "b")!;
    expect(a.startTicks).toBe(7680);
    expect(b.startTicks - a.startTicks).toBe(len + 3840);
  });

  it("gain gesture preview + commit", () => {
    const p = projectWithAudio();
    const lane = audioLaneId(p.audioTracks[0]!.id);
    const session = baseSession({
      kind: "gain",
      originGainDb: 0,
      originClientY: 100,
      lane,
    });
    const preview = previewAudioFromSession(p, session, 0, false, false, 60);
    expect(preview.kind).toBe("gain");
    expect(preview.gainDb).toBeCloseTo(40 * GAIN_TOOL_DB_PER_PX);
    const next = commitAudioGesture(p, lane, session, preview, false, false);
    expect(next.audioClips[0]!.gainDb).toBeCloseTo(40 * GAIN_TOOL_DB_PER_PX);
  });

  it("setAudioBus* no-ops unknown bus and applies mute/pan/name/mode", () => {
    let p = createProjectSeed("p", "S", "2026-07-20T12:00:00.000Z") as Project;
    const { project: withBus, busId } = addAudioBus(p, "Bus A");
    p = withBus;
    expect(setAudioBusGainDb(p, "missing", -6)).toBe(p);
    expect(setAudioBusPan(p, "missing", 0.5)).toBe(p);
    expect(setAudioBusMuted(p, "missing", true)).toBe(p);
    expect(setAudioBusName(p, busId, "   ")).toBe(p);

    p = setAudioBusGainDb(p, busId, -3);
    expect(p.audioBusses!.find((b) => b.id === busId)!.gainDb).toBe(-3);

    p = setAudioBusPan(p, busId, 0.5);
    expect(p.audioBusses!.find((b) => b.id === busId)!.pan).toBe(0.5);
    p = setAudioBusPan(p, busId, Number.NaN);
    expect(p.audioBusses!.find((b) => b.id === busId)!.pan).toBeUndefined();
    p = setAudioBusPan(p, busId, 1e-7);
    expect(p.audioBusses!.find((b) => b.id === busId)!.pan).toBeUndefined();

    p = setAudioBusMuted(p, busId, true);
    expect(p.audioBusses!.find((b) => b.id === busId)!.muted).toBe(true);
    p = setAudioBusMuted(p, busId, false);
    expect(p.audioBusses!.find((b) => b.id === busId)!.muted).toBeUndefined();

    p = setAudioBusChannelMode(p, busId, "mono");
    expect(p.audioBusses!.find((b) => b.id === busId)!.channelMode).toBe(
      "mono",
    );
    p = setAudioBusChannelMode(p, busId, "stereo");
    expect(
      p.audioBusses!.find((b) => b.id === busId)!.channelMode,
    ).toBeUndefined();

    p = setAudioBusName(p, busId, "  Reverb  ");
    expect(p.audioBusses!.find((b) => b.id === busId)!.name).toBe("Reverb");
  });
});
