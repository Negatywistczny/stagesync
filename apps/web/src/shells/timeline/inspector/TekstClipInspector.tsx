import React from "react";
import type { Project, TekstClip } from "@stagesync/shared";
import {
  setTekstClipStart,
  setTekstClipText,
} from "@lib/timeline-edit/tekstEdit.js";
import {
  clampBeatForProject,
  formatStartBarBeat,
  parseStartBarBeat,
  ticksFromDisplayBarBeat,
} from "@lib/timeline/clipStartEdit.js";
import styles from "../../TimelineShell.module.css";

export function TekstClipInspector({
  draftProject,
  commitDraft,
  selectedTekstClip,
}: {
  draftProject: Project | null;
  commitDraft: (next: Project) => void;
  selectedTekstClip: TekstClip;
}) {
  return (
    <div className={styles.inspBody}>
      <label className={styles.inspField}>
        Tekst linii
        <textarea
          className={styles.nameInput}
          value={selectedTekstClip.text}
          aria-label="Tekst linii"
          rows={3}
          onChange={(e) => {
            if (!draftProject) return;
            commitDraft(
              setTekstClipText(
                draftProject,
                selectedTekstClip.id,
                e.target.value,
              ),
            );
          }}
        />
      </label>
      <label className={styles.inspField}>
        Start (takt.beat)
        <input
          className={styles.nameInput}
          defaultValue={formatStartBarBeat(
            draftProject!,
            selectedTekstClip.startTicks,
          )}
          key={`tekst-start-${selectedTekstClip.id}-${selectedTekstClip.startTicks}`}
          aria-label="Start tekstu (takt.beat)"
          onBlur={(e) => {
            if (!draftProject) return;
            const parsed = parseStartBarBeat(e.target.value);
            if (!parsed) return;
            const beat = clampBeatForProject(
              draftProject,
              parsed.bar,
              parsed.beat,
            );
            const startTicks = ticksFromDisplayBarBeat(
              draftProject,
              parsed.bar,
              beat,
            );
            commitDraft(
              setTekstClipStart(draftProject, selectedTekstClip.id, startTicks),
            );
          }}
        />
      </label>
      <p>
        start {selectedTekstClip.startTicks}, długość{" "}
        {selectedTekstClip.lengthTicks} ticks
      </p>
    </div>
  );
}
