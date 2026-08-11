import React from "react";
import type { Project, AkordClip } from "@stagesync/shared";
import {
  commitAkordyClipSymbol,
  setAkordyClipSymbol,
} from "@lib/timeline-edit/akordyEdit.js";
import {
  clampBeatForProject,
  formatStartBarBeat,
  moveClipStartKeepLength,
  parseStartBarBeat,
} from "@lib/timeline/clipStartEdit.js";
import styles from "../../TimelineShell.module.css";

export function AkordClipInspector({
  draftProject,
  commitDraft,
  selectedAkordClip,
}: {
  draftProject: Project | null;
  commitDraft: (next: Project) => void;
  selectedAkordClip: AkordClip;
}) {
  return (
    <div className={styles.inspBody}>
      <label className={styles.inspField}>
        Symbol akordu
        <input
          className={styles.nameInput}
          value={selectedAkordClip.symbol}
          aria-label="Symbol akordu"
          onChange={(e) => {
            if (!draftProject) return;
            commitDraft(
              setAkordyClipSymbol(
                draftProject,
                selectedAkordClip.id,
                e.target.value,
              ),
            );
          }}
          onBlur={(e) => {
            if (!draftProject) return;
            commitDraft(
              commitAkordyClipSymbol(
                draftProject,
                selectedAkordClip.id,
                e.target.value,
              ),
            );
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
          }}
        />
      </label>
      <label className={styles.inspField}>
        Start (takt.beat)
        <input
          className={styles.nameInput}
          defaultValue={formatStartBarBeat(
            draftProject!,
            selectedAkordClip.startTicks,
          )}
          key={`akord-start-${selectedAkordClip.id}-${selectedAkordClip.startTicks}`}
          aria-label="Start akordu (takt.beat)"
          onBlur={(e) => {
            if (!draftProject) return;
            const parsed = parseStartBarBeat(e.target.value);
            if (!parsed) return;
            const beat = clampBeatForProject(
              draftProject,
              parsed.bar,
              parsed.beat,
            );
            commitDraft({
              ...draftProject,
              akordy: {
                clips: moveClipStartKeepLength(
                  draftProject,
                  draftProject.akordy.clips,
                  selectedAkordClip.id,
                  parsed.bar,
                  beat,
                ),
              },
            });
          }}
        />
      </label>
      <p>
        start {selectedAkordClip.startTicks}, długość{" "}
        {selectedAkordClip.lengthTicks} ticks
      </p>
    </div>
  );
}
