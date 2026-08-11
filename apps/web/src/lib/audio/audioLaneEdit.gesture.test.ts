import { describe, expect, it } from "vitest";
import {
  addAudioTrack,
  commitAudioGesture,
  previewAudioFromSession,
} from "./audioLaneEdit.js";
import { audioLaneId } from "@lib/timeline/timelineTracks.js";
import type {
  FormaGesturePreview,
  FormaGestureSession,
} from "@lib/timeline/timelineGesture.js";
import {
  abutProject,
  baseSession,
  projectWithAudio,
} from "./audioLaneEdit.test-helpers.js";

describe("audioLaneEdit — gesture operations", () => {
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
