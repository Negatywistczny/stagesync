import styles from "../ClientShell.module.css";
import { formatChordForDisplay, type Project } from "@stagesync/shared";
import { buildGridLiveContext } from "../../lib/clientGrid.js";
import type { ClientDisplayPrefs } from "../../lib/clientDisplayPrefs.js";

type Props = {
  project: Project | null;
  displayTicks: number;
  loading: boolean;
  hasActiveProjectId: boolean;
  prefs: ClientDisplayPrefs;
};

export function GridPane({
  project,
  displayTicks,
  loading,
  hasActiveProjectId,
  prefs,
}: Props) {
  if (!hasActiveProjectId) {
    return <p className={styles.empty}>Oczekiwanie na utwór…</p>;
  }
  if (loading && !project) {
    return <p className={styles.empty}>Wczytywanie utworu…</p>;
  }
  if (!project) {
    return <p className={styles.empty}>Nie udało się wczytać utworu.</p>;
  }

  const ctx = buildGridLiveContext(project, displayTicks);
  if (ctx.emptyReason) {
    return <p className={styles.empty}>{ctx.emptyReason}</p>;
  }

  const fmt = (symbol: string) =>
    formatChordForDisplay(symbol, {
      literalQuality: prefs.literalQuality,
      hybridPolishB: prefs.hybridPolishB,
    });

  return (
    <div
      className={[
        styles.gridPane,
        prefs.gridAnimations ? "" : styles.gridAnimationsOff,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-live="polite"
    >
      <p className={styles.gridCurrent}>
        {ctx.current ? fmt(ctx.current.symbol) : "—"}
      </p>
      {ctx.upcoming.length > 0 ? (
        <div className={styles.gridUpcomingRow} aria-label="Następne akordy">
          {ctx.upcoming.map((c) => (
            <span key={c.id} className={styles.gridUpcomingChord}>
              {fmt(c.symbol)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
