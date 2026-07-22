import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import {
  buildClipboardFromClips,
  pasteClipboardAt,
} from "./timelineClipboard.js";
import { audioLaneId } from "./timelineTracks.js";

describe("timelineClipboard audio", () => {
  it("copies and pastes an audio clip on the same track", () => {
    const base = createProjectV5Seed("p1", "Song", "2026-07-22T00:00:00.000Z");
    const trackId = "track-a";
    const assetId = "asset-a";
    const project = {
      ...base,
      audioTracks: [{ id: trackId, name: "A" }],
      assets: [
        {
          id: assetId,
          storageName: "a.wav",
          originalName: "a.wav",
          kind: "audio" as const,
          mimeType: "audio/wav",
          sizeBytes: 10,
        },
      ],
      audioClips: [
        {
          id: "clip-1",
          trackId,
          assetId,
          startTicks: 0,
          lengthTicks: 3840,
          gainDb: -3,
        },
      ],
    };
    const lane = audioLaneId(trackId);
    const board = buildClipboardFromClips(lane, project.audioClips);
    expect(board?.items).toHaveLength(1);
    const pasted = pasteClipboardAt(project, board!, 7680);
    expect(pasted?.newIds).toHaveLength(1);
    expect(pasted?.project.audioClips).toHaveLength(2);
    const copy = pasted!.project.audioClips.find(
      (c) => c.id === pasted!.newIds[0],
    );
    expect(copy).toMatchObject({
      trackId,
      assetId,
      startTicks: 7680,
      lengthTicks: 3840,
      gainDb: -3,
    });
  });
});
