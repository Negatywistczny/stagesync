import React from "react";

interface TimelineAudioFileInputProps {
  laneAudioFileRef: React.RefObject<HTMLInputElement | null>;
  audioUploadPending: boolean;
  laneImportTrackIdRef: React.RefObject<string | null>;
  laneImportStartTicksRef: React.RefObject<number | null>;
  onUploadAudioToTrack: (
    trackId: string,
    file: File,
    opts?: { startTicks?: number },
  ) => Promise<void>;
}

export function TimelineAudioFileInput({
  laneAudioFileRef,
  audioUploadPending,
  laneImportTrackIdRef,
  laneImportStartTicksRef,
  onUploadAudioToTrack,
}: TimelineAudioFileInputProps) {
  return (
    <input
      ref={laneAudioFileRef}
      type="file"
      accept="audio/*,.mp3,.wav,.aiff,.aif,.m4a,.flac,.ogg"
      hidden
      disabled={audioUploadPending}
      onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        const trackId = laneImportTrackIdRef.current;
        const startTicks = laneImportStartTicksRef.current;
        laneImportTrackIdRef.current = null;
        laneImportStartTicksRef.current = null;
        if (f && trackId) {
          void onUploadAudioToTrack(
            trackId,
            f,
            startTicks != null ? { startTicks } : undefined,
          );
        }
      }}
    />
  );
}
