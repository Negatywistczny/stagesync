import React from "react";
import { Button } from "@stagesync/ui";
import type { Project, FormaClip } from "@stagesync/shared";
import {
  addFormaSubsection,
  countdownBars,
  deleteFormaSubsection,
  setFormaSubsectionStartBar,
} from "@lib/timeline-edit/formaInspector.js";
import styles from "../../TimelineShell.module.css";

export function FormaClipInspector({
  draftProject,
  commitDraft,
  selectedClip,
  selectedSubsectionRows,
  selectedSubsectionIdx,
  setSelectedSubsectionIdx,
  onClipRename,
  onCountdownBarsChange,
}: {
  draftProject: Project | null;
  commitDraft: (next: Project) => void;
  selectedClip: FormaClip;
  selectedSubsectionRows: { index: number; startDisplayBar: number }[];
  selectedSubsectionIdx: number | null;
  setSelectedSubsectionIdx: (idx: number | null) => void;
  onClipRename: (name: string) => void;
  onCountdownBarsChange: (raw: string) => void;
}) {
  return (
        <div className={styles.inspBody}>
          {selectedClip.kind === "section" ? (
            <label className={styles.inspField}>
              Nazwa sekcji
              <input
                className={styles.nameInput}
                value={selectedClip.name}
                aria-label="Nazwa sekcji"
                onChange={(e) => onClipRename(e.target.value)}
              />
            </label>
          ) : (
            <p>
              <strong>{selectedClip.name}</strong> — zablokowany Countdown
            </p>
          )}
          {selectedClip.kind === "section" ? (
            <label className={styles.inspField}>
              Notatka (Client Forma)
              <textarea
                className={styles.nameInput}
                rows={2}
                value={selectedClip.note ?? ""}
                aria-label="Notatka sekcji"
                onChange={(e) => {
                  if (!draftProject || !selectedClip) return;
                  const note = e.target.value;
                  commitDraft({
                    ...draftProject,
                    forma: {
                      clips: draftProject.forma.clips.map((c) =>
                        c.id === selectedClip.id
                          ? {
                              ...c,
                              note: note.length > 0 ? note : undefined,
                            }
                          : c,
                      ),
                    },
                  });
                }}
              />
            </label>
          ) : null}
          {selectedClip.kind === "section" ? (
            <div className={styles.inspField}>
              <span>Podsekcje</span>
              <span className={styles.metaRead}>
                {selectedSubsectionRows.length}
              </span>
              <div className={styles.subEditor} aria-label="Podsekcje sekcji">
                {selectedSubsectionRows.length === 0 ? (
                  <div className={styles.metaRead}>Brak podsekcji</div>
                ) : (
                  selectedSubsectionRows.map((row) => {
                    const canDelete = selectedSubsectionRows.length >= 2;
                    const selected = selectedSubsectionIdx === row.index;
                    return (
                      <div
                        key={`sub-${row.index}`}
                        className={[
                          styles.subEditorRow,
                          selected ? styles.subEditorRowSelected : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => setSelectedSubsectionIdx(row.index)}
                      >
                        <span
                          className={styles.subEditorIdx}
                          aria-hidden="true"
                        >
                          #{row.index + 1}
                        </span>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          className={styles.subEditorBar}
                          value={row.startDisplayBar}
                          disabled={row.index === 0}
                          title={
                            row.index === 0
                              ? "Start sekcji (zablokowany)"
                              : "Takt początkowy podsekcji"
                          }
                          aria-label={`Takt początkowy podsekcji ${row.index + 1}`}
                          onFocus={() => setSelectedSubsectionIdx(row.index)}
                          onChange={(e) => {
                            if (!draftProject || !selectedClip) return;
                            if (row.index === 0) return;
                            const next = setFormaSubsectionStartBar(
                              draftProject,
                              selectedClip.id,
                              row.index,
                              Number(e.target.value),
                            );
                            if (next !== draftProject) commitDraft(next);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          type="button"
                          className={styles.subEditorDel}
                          disabled={!canDelete}
                          title="Usuń podsekcję"
                          aria-label={`Usuń podsekcję ${row.index + 1}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!draftProject || !selectedClip) return;
                            const result = deleteFormaSubsection(
                              draftProject,
                              selectedClip.id,
                              row.index,
                            );
                            if (!result) return;
                            commitDraft(result.project);
                            setSelectedSubsectionIdx(result.selectIdx);
                          }}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })
                )}
                <Button
                  type="button"
                  variant="ghost"
                  className={styles.subEditorAdd}
                  onClick={() => {
                    if (!draftProject || !selectedClip) return;
                    const result = addFormaSubsection(
                      draftProject,
                      selectedClip.id,
                    );
                    if (!result) return;
                    commitDraft(result.project);
                    setSelectedSubsectionIdx(result.selectIdx);
                  }}
                >
                  +
                </Button>
              </div>
            </div>
          ) : null}
          {selectedClip.kind === "countdown" ? (
            <label className={styles.inspField}>
              Długość (takty)
              <input
                className={styles.lengthInput}
                type="number"
                min={1}
                step={1}
                value={countdownBars(draftProject!, selectedClip)}
                aria-label="Długość Countdown w taktach"
                onChange={(e) => onCountdownBarsChange(e.target.value)}
              />
            </label>
          ) : (
            <p>
              start {selectedClip.startTicks}, długość{" "}
              {selectedClip.lengthTicks} ticks
            </p>
          )}
        </div>
  );
}
