import React, { useRef } from "react";
import { Button } from "@stagesync/ui";
import type { Project, AudioTrack } from "@stagesync/shared";
import {
  setAudioTrackGainDb,
  setAudioTrackName,
} from "@lib/audio/audioLaneEdit.js";
import { TaperGainSlider } from "../channelStrip/TaperGainSlider.js";
import styles from "../TimelineShell.module.css";

export function AudioTrackInspector({
  draftProject,
  commitDraft,
  selectedDockAudioTrack,
  audioUploadPending,
  onUploadAudioToTrack,
}: {
  draftProject: Project | null;
  commitDraft: (next: Project) => void;
  selectedDockAudioTrack: AudioTrack;
  audioUploadPending: boolean;
  onUploadAudioToTrack: (trackId: string, file: File) => Promise<void>;
}) {
  const inspAudioFileRef = useRef<HTMLInputElement>(null);
  return (
    <div className={styles.inspBody}>
      <p className={styles.muted}>Ścieżka audio</p>
      <label className={styles.inspField}>
        Nazwa
        <input
          className={styles.nameInput}
          value={selectedDockAudioTrack.name}
          aria-label="Nazwa ścieżki"
          onChange={(e) => {
            if (!draftProject) return;
            commitDraft(
              setAudioTrackName(
                draftProject,
                selectedDockAudioTrack.id,
                e.target.value,
              ),
            );
          }}
        />
      </label>
      <label className={styles.inspField}>
        Fader (dB)
        <div
          onDoubleClick={(e) => {
            e.preventDefault();
            if (!draftProject) return;
            commitDraft(
              setAudioTrackGainDb(draftProject, selectedDockAudioTrack.id, 0),
            );
          }}
          title="Dwuklik — 0.0 dB"
        >
          <TaperGainSlider
            aria-label="Fader ścieżki"
            gainDb={selectedDockAudioTrack.gainDb ?? 0}
            onGainChange={(v: number) => {
              if (!draftProject) return;
              commitDraft(
                setAudioTrackGainDb(draftProject, selectedDockAudioTrack.id, v),
              );
            }}
          />
        </div>
      </label>
      <div className={styles.inspField}>
        <input
          ref={inspAudioFileRef}
          type="file"
          accept="audio/*,.mp3,.wav,.aiff,.aif,.m4a,.flac,.ogg"
          hidden
          disabled={audioUploadPending}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) {
              void onUploadAudioToTrack(selectedDockAudioTrack.id, f);
            }
          }}
        />
        <Button
          type="button"
          variant="ghost"
          disabled={audioUploadPending}
          onClick={() => inspAudioFileRef.current?.click()}
        >
          {audioUploadPending ? "Przesyłanie…" : "Importuj plik"}
        </Button>
      </div>
    </div>
  );
}
