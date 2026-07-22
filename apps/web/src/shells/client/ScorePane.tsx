/**
 * OSMD / MusicXML score stub (α8 should) — empty/error chrome matches v4 score-wrap feel.
 */

import type { Project } from "@stagesync/shared";
import styles from "../ClientShell.module.css";

type Props = {
  project: Project | null;
  loading: boolean;
  hasActiveProjectId: boolean;
};

export function ScorePane({ project, loading, hasActiveProjectId }: Props) {
  if (!hasActiveProjectId) {
    return <p className={styles.empty}>Oczekiwanie na utwór…</p>;
  }
  if (loading && !project) {
    return <p className={styles.empty}>Wczytywanie utworu…</p>;
  }
  if (!project) {
    return <p className={styles.empty}>Nie udało się wczytać utworu.</p>;
  }

  const xmlAssets = (project.assets ?? []).filter(
    (a) => a.kind === "musicxml",
  );

  return (
    <div className={styles.scorePane}>
      <div className={styles.scoreWrap}>
        <div className={styles.scoreEmptyCard}>
          <p className={styles.scoreEmptyTitle}>Partytura</p>
          <p className={styles.scoreEmptyText}>
            Stub OSMD. Pełna nawigacja nut — poza 5.0.0.
          </p>
          {xmlAssets.length > 0 ? (
            <ul className={styles.scoreFiles}>
              {xmlAssets.map((a) => (
                <li key={a.id}>{a.originalName}</li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>
              Brak pliku MusicXML w projekcie — dodaj w Admin → Utwory → Wybrany
              (XML / Pliki projektu).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
