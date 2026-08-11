import { describe, expect, it } from "vitest";
import {
  createProjectSeed,
  elapsedToTicks,
  MAX_AUDIO_BUSSES,
  type Project,
} from "@stagesync/shared";
import {
  addAudioTrack,
  applyAbutCrossfadeForClip,
  applyDecodedAudioMeta,
  audioAsForma,
  commitMoveAudioClip,
  commitMoveAudioClips,
  commitResizeAudioClip,
  deleteAudioClip,
  duplicateAudioTrack,
  MAX_AUDIO_TRACKS,
  placeImportedAudioClipAt,
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
  setAudioBusOutput,
  removeAudioBus,
  setMasterGainDb,
} from "./audioLaneEdit.js";
import { abutProject, projectWithAudio } from "./audioLaneEdit.test-helpers.js";

describe("audioLaneEdit — clip & track operations", () => {
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
});
