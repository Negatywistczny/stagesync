import React from "react";
import type { Project, ScoreBarAnchor } from "@stagesync/shared";
import { updateScoreAnchor } from "@lib/timeline-edit/scoreBarEdit.js";
import styles from "../TimelineShell.module.css";

export function ScoreAnchorInspector({
  draftProject,
  commitDraft,
  selectedAnchor,
}: {
  draftProject: Project | null;
  commitDraft: (next: Project) => void;
  selectedAnchor: ScoreBarAnchor;
}) {
  return (
    <div className={styles.inspBody}>
      <p>
        Kotwica {selectedAnchor.logicBar} → {selectedAnchor.scoreBar}
      </p>
      <label className={styles.inspField}>
        Takt utworu (logicBar)
        <input
          className={styles.lengthInput}
          type="number"
          min={1}
          value={selectedAnchor.logicBar}
          onChange={(e) => {
            if (!draftProject) return;
            const n = Number.parseInt(e.target.value, 10);
            if (!Number.isFinite(n)) return;
            commitDraft(
              updateScoreAnchor(draftProject, selectedAnchor.id, {
                logicBar: n,
              }),
            );
          }}
        />
      </label>
      <label className={styles.inspField}>
        Takt partytury (scoreBar)
        <input
          className={styles.lengthInput}
          type="number"
          min={1}
          value={selectedAnchor.scoreBar}
          onChange={(e) => {
            if (!draftProject) return;
            const n = Number.parseInt(e.target.value, 10);
            if (!Number.isFinite(n)) return;
            commitDraft(
              updateScoreAnchor(draftProject, selectedAnchor.id, {
                scoreBar: n,
              }),
            );
          }}
        />
      </label>
    </div>
  );
}
