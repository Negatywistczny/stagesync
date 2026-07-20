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

  const hero =
    ctx.cycle.find((s) => s.active)?.symbol ??
    (ctx.current ? ctx.current.symbol : "—");

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
      <p className={styles.gridCurrent}>{fmt(hero)}</p>
      {ctx.cycle.length > 0 ? (
        <div className={styles.cycleRow} aria-label="Cykl akordów">
          {ctx.cycle.map((step, i) => (
            <div
              key={`${step.symbol}-${i}`}
              className={[
                styles.cycleCell,
                step.active ? styles.cycleCellActive : "",
                prefs.gridAnimations ? styles.cycleCellAnim : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ flexGrow: step.bars, flexBasis: `${step.bars * 2.5}rem` }}
              title={
                step.bars > 1
                  ? `${fmt(step.symbol)} · ${step.bars} takty`
                  : fmt(step.symbol)
              }
            >
              <span className={styles.cycleCellSymbol}>{fmt(step.symbol)}</span>
              {step.bars > 1 ? (
                <span className={styles.cycleCellBars}>{step.bars}</span>
              ) : null}
            </div>
          ))}
        </div>
      ) : ctx.upcoming.length > 0 ? (
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
