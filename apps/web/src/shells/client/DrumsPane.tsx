import {
  resolveFormaClipAt,
  type Project,
} from "@stagesync/shared";
import type { CSSProperties } from "react";
import { buildFormaLiveContext } from "../../lib/clientForma.js";
import styles from "../ClientShell.module.css";

type DrumsPaneProps = {
  project: Project;
  displayTicks: number;
  notesEdit?: boolean;
  onNoteChange?: (clipId: string, note: string) => void;
};

export function DrumsPane({
  project,
  displayTicks,
  notesEdit = false,
  onNoteChange,
}: DrumsPaneProps) {
  const ctx = buildFormaLiveContext(project, displayTicks);
  const section = resolveFormaClipAt(project, displayTicks);

  if (!ctx) {
    return <p className={styles.empty}>Oczekiwanie na utwór…</p>;
  }

  return (
    <div className={styles.formaPane}>
      <p className={styles.formaSection}>{ctx.sectionName}</p>
      <p className={styles.formaMeta} aria-label="Pozycja">
        takt {ctx.bbtLabel}
        {ctx.barInSection != null
          ? ` · ${ctx.barInSection}/${ctx.segments.find((s) => s.active)?.barCount ?? "—"} w sekcji`
          : null}
        {` · ${ctx.tempoBpm} BPM · ${ctx.meterLabel}`}
      </p>
      <div
        className={styles.beatDots}
        aria-label={`Beat ${ctx.currentBeat} / ${ctx.beatsPerBar}`}
      >
        {Array.from({ length: ctx.beatsPerBar }, (_, i) => (
          <span
            key={i}
            className={[
              styles.beatDot,
              i + 1 === ctx.currentBeat ? styles.beatDotActive : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        ))}
      </div>
      {notesEdit && section && section.kind === "section" && onNoteChange ? (
        <label className={styles.field}>
          Notatka sekcji
          <textarea
            className={styles.noteInput}
            rows={3}
            value={section.note ?? ""}
            onChange={(e) => onNoteChange(section.id, e.target.value)}
          />
        </label>
      ) : section?.note ? (
        <p className={styles.formaNote}>{section.note}</p>
      ) : (
        <p className={styles.formaNoteMuted}>Brak notatki dla tej sekcji</p>
      )}
      <div className={styles.formaStrip} aria-label="Forma — takty">
        {ctx.segments.map((seg) => (
          <section
            key={seg.id}
            className={[
              styles.formaSegment,
              seg.active ? styles.formaSegmentActive : "",
              seg.kind === "countdown" ? styles.formaSegmentCd : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <header className={styles.formaSegmentHead}>
              <span className={styles.formaListName}>{seg.name}</span>
              <span className={styles.formaSegmentBars}>
                {seg.barCount} takt{seg.barCount === 1 ? "" : "ów"}
              </span>
            </header>
            <div className={styles.barStrip}>
              {seg.cells.map((cell) => (
                <div
                  key={`${seg.id}-${cell.index}`}
                  className={[
                    styles.barCell,
                    cell.past ? styles.barCellPast : "",
                    cell.current ? styles.barCellCurrent : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={
                    cell.current
                      ? ({
                          ["--beat-progress" as string]: String(
                            cell.beatProgress,
                          ),
                        } as CSSProperties)
                      : undefined
                  }
                  title={
                    cell.barDisplay > 0
                      ? `Takt ${cell.barDisplay}`
                      : `CD ${cell.index}`
                  }
                />
              ))}
            </div>
            {seg.note && !notesEdit ? (
              <p className={styles.formaSegmentNote}>{seg.note}</p>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
