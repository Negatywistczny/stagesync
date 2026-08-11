import { describe, expect, it } from "vitest";
import {
  createProjectSeed,
  ticksToMs,
  ticksToMsAlongTempoMap,
  type Project,
} from "@stagesync/shared";
import {
  addAudioBus,
  commitAudioGesture,
  commitMoveAudioClips,
  commitResizeAudioClip,
  GAIN_TOOL_DB_PER_PX,
  gainDbFromPointerDelta,
  joinAdjacentAudioClips,
  previewAudioFromSession,
  setAudioBusChannelMode,
  setAudioBusGainDb,
  setAudioBusMuted,
  setAudioBusName,
  setAudioBusPan,
  setAudioClipGainDb,
  splitAudioClipAt,
  toggleAudioClipMute,
} from "./audioLaneEdit.js";
import { audioLaneId } from "@lib/timeline/timelineTracks.js";
import {
  abutProject,
  baseSession,
  projectWithAudio,
} from "./audioLaneEdit.test-helpers.js";

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
