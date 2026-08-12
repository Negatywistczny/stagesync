// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { TimelineAudioFileInput } from "./TimelineAudioFileInput.js";

describe("TimelineAudioFileInput", () => {
  it("triggers upload when a file is selected and clears ref state", async () => {
    const onUploadAudioToTrack = vi.fn().mockResolvedValue(undefined);
    const laneAudioFileRef = { current: null };
    const laneImportTrackIdRef = { current: "track-1" };
    const laneImportStartTicksRef = { current: 1920 };

    const { container } = render(
      <TimelineAudioFileInput
        laneAudioFileRef={laneAudioFileRef}
        audioUploadPending={false}
        laneImportTrackIdRef={laneImportTrackIdRef}
        laneImportStartTicksRef={laneImportStartTicksRef}
        onUploadAudioToTrack={onUploadAudioToTrack}
      />,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input).toBeTruthy();

    const file = new File(["dummy"], "song.wav", { type: "audio/wav" });
    fireEvent.change(input, { target: { files: [file] } });

    expect(onUploadAudioToTrack).toHaveBeenCalledWith("track-1", file, {
      startTicks: 1920,
    });
    expect(laneImportTrackIdRef.current).toBeNull();
    expect(laneImportStartTicksRef.current).toBeNull();
  });
});
