import {
  resolveFormaClipAt,
  type Project,
} from "@stagesync/shared";
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
  const section = resolveFormaClipAt(project, displayTicks);
  const sections = project.forma.clips.filter((c) => c.kind === "section");

  return (
    <div className={styles.formaPane}>
      <p className={styles.formaSection}>{section?.name ?? "—"}</p>
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
      {sections.length > 0 ? (
        <ul className={styles.formaList} aria-label="Sekcje Formy">
          {sections.map((s) => {
            const active = section?.id === s.id;
            return (
              <li
                key={s.id}
                className={[
                  styles.formaListItem,
                  active ? styles.formaListItemActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className={styles.formaListName}>{s.name}</span>
                {s.note ? (
                  <span className={styles.formaListNote}>{s.note}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
