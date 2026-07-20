import type { Project } from "@stagesync/shared";
import { buildKaraokeLiveContext } from "../../lib/clientKaraoke.js";
import styles from "../ClientShell.module.css";

type KaraokePaneProps = {
  project: Project | null;
  displayTicks: number;
  loading: boolean;
  hasActiveProjectId: boolean;
};

export function KaraokePane({
  project,
  displayTicks,
  loading,
  hasActiveProjectId,
}: KaraokePaneProps) {
  if (!hasActiveProjectId) {
    return <p className={styles.empty}>Oczekiwanie na utwór…</p>;
  }

  if (loading && !project) {
    return <p className={styles.empty}>Wczytywanie utworu…</p>;
  }

  if (!project) {
    return <p className={styles.empty}>Nie udało się wczytać utworu.</p>;
  }

  const ctx = buildKaraokeLiveContext(project, displayTicks);
  if (!ctx) {
    return <p className={styles.empty}>Oczekiwanie na utwór…</p>;
  }

  return (
    <div className={styles.karaokePane}>
      <p className={styles.karaokeTitle}>{ctx.songTitle}</p>
      <p className={styles.karaokeMeta}>
        {ctx.sectionName} · takt {ctx.bbtLabel}
      </p>
      <p className={styles.karaokeMeta}>
        {ctx.tempoBpm} BPM · {ctx.meterLabel}
      </p>
      {ctx.hasLyricLines ? (
        <div className={styles.karaokeLines} aria-label="Linie tekstu">
          <p className={styles.karaokeLine}>
            {ctx.lyricLine ?? "—"}
          </p>
        </div>
      ) : (
        <div className={styles.karaokePlaceholder}>
          <p className={styles.karaokePlaceholderTitle}>Brak linii tekstu</p>
          <p className={styles.muted}>
            Dodaj clipy na lane Tekst w Timeline (Pencil).
          </p>
          <ul className={styles.karaokeSkeleton} aria-hidden>
            <li>— — —</li>
            <li>— — —</li>
            <li>— — —</li>
          </ul>
        </div>
      )}
    </div>
  );
}
