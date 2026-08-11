import styles from "../SmartTempoAccuracyDashboard.module.css";

export function DashboardKpiCards({
  gradeMode,
  stats,
  deltas,
}: {
  gradeMode: "daw" | "stage";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stats: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deltas: any;
}) {
  return (
    <div className={styles.kpiGrid}>
      {gradeMode === "daw" ? (
        <>
          {/* DAW Exact KPI */}
          <div className={`${styles.kpiCard} ${styles.kpiCardExact}`}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>🟢 Dokładne (≤ 60 ms)</span>
              <span className={`${styles.kpiBadge} ${styles.badgeExact}`}>
                DAW Grade
              </span>
            </div>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{stats.exactPct}%</span>
              {deltas && (
                <span
                  className={`${styles.deltaBadge} ${
                    deltas.exactDelta > 0
                      ? styles.deltaGood
                      : deltas.exactDelta < 0
                        ? styles.deltaBad
                        : styles.deltaNeutral
                  }`}
                  title={`Δ vs baseline ${deltas.baseExactPct}%`}
                >
                  {deltas.exactDelta > 0
                    ? `+${deltas.exactDelta}% 🟢`
                    : deltas.exactDelta < 0
                      ? `${deltas.exactDelta}% 🔴`
                      : `0%`}
                </span>
              )}
            </div>
            <div className={styles.kpiMeta}>
              {stats.exactCount} z {stats.total} miar (≤ 1/32 nuty przy 120 BPM)
            </div>
          </div>

          {/* DAW Close KPI */}
          <div className={`${styles.kpiCard} ${styles.kpiCardClose}`}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>🟡 Tolerancja (60–125 ms)</span>
              <span className={`${styles.kpiBadge} ${styles.badgeClose}`}>
                Rubato
              </span>
            </div>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{stats.closePct}%</span>
              {deltas && (
                <span
                  className={`${styles.deltaBadge} ${
                    deltas.closeDelta < 0
                      ? styles.deltaGood
                      : deltas.closeDelta > 0
                        ? styles.deltaBad
                        : styles.deltaNeutral
                  }`}
                >
                  {deltas.closeDelta > 0
                    ? `+${deltas.closeDelta}%`
                    : deltas.closeDelta < 0
                      ? `${deltas.closeDelta}%`
                      : `0%`}
                </span>
              )}
            </div>
            <div className={styles.kpiMeta}>
              {stats.closeCount} miar w paśmie rubato (≤ 1/16 nuty)
            </div>
          </div>

          {/* DAW Fail KPI */}
          <div className={`${styles.kpiCard} ${styles.kpiCardFail}`}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>🔴 Błąd (&gt; 125 ms)</span>
              <span className={`${styles.kpiBadge} ${styles.badgeFail}`}>
                {stats.failPct <= 10 ? "✅ Pass ≤10%" : "⚠️ Over"}
              </span>
            </div>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{stats.failPct}%</span>
              {deltas && (
                <span
                  className={`${styles.deltaBadge} ${
                    deltas.failDelta < 0
                      ? styles.deltaGood
                      : deltas.failDelta > 0
                        ? styles.deltaBad
                        : styles.deltaNeutral
                  }`}
                >
                  {deltas.failDelta > 0
                    ? `+${deltas.failDelta}% 🔴`
                    : deltas.failDelta < 0
                      ? `${deltas.failDelta}% 🟢`
                      : `0%`}
                </span>
              )}
            </div>
            <div className={styles.kpiMeta}>
              {stats.failCount} miar z przekroczoną tolerancją DAW
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Stage Perfect KPI */}
          <div className={`${styles.kpiCard} ${styles.kpiCardExact}`}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>
                🟢 Stage Perfect (≤ 15 ms)
              </span>
              <span className={`${styles.kpiBadge} ${styles.badgeExact}`}>
                IEM Safe
              </span>
            </div>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{stats.stagePerfectPct}%</span>
              {deltas && (
                <span
                  className={`${styles.deltaBadge} ${
                    deltas.perfectDelta > 0
                      ? styles.deltaGood
                      : deltas.perfectDelta < 0
                        ? styles.deltaBad
                        : styles.deltaNeutral
                  }`}
                  title={`Δ vs baseline ${deltas.basePerfectPct}%`}
                >
                  {deltas.perfectDelta > 0
                    ? `+${deltas.perfectDelta}% 🟢`
                    : deltas.perfectDelta < 0
                      ? `${deltas.perfectDelta}% 🔴`
                      : `0%`}
                </span>
              )}
            </div>
            <div className={styles.kpiMeta}>
              {stats.stagePerfectCount} z {stats.total} miar (Zero IEM flam /
              Konzert-ready)
            </div>
          </div>

          {/* Stage Acceptable KPI */}
          <div className={`${styles.kpiCard} ${styles.kpiCardClose}`}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>
                🟡 Stage Acceptable (15–35 ms)
              </span>
              <span className={`${styles.kpiBadge} ${styles.badgeClose}`}>
                DMX Safe
              </span>
            </div>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>
                {stats.stageAcceptablePct}%
              </span>
              {deltas && (
                <span
                  className={`${styles.deltaBadge} ${
                    deltas.acceptableDelta < 0
                      ? styles.deltaGood
                      : deltas.acceptableDelta > 0
                        ? styles.deltaBad
                        : styles.deltaNeutral
                  }`}
                >
                  {deltas.acceptableDelta > 0
                    ? `+${deltas.acceptableDelta}%`
                    : deltas.acceptableDelta < 0
                      ? `${deltas.acceptableDelta}%`
                      : `0%`}
                </span>
              )}
            </div>
            <div className={styles.kpiMeta}>
              {stats.stageAcceptableCount} miar z mikro-rubato bezpiecznym dla
              sekcji i świateł
            </div>
          </div>

          {/* Stage Unusable KPI */}
          <div className={`${styles.kpiCard} ${styles.kpiCardFail}`}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>
                🔴 Stage Unusable (&gt; 35 ms)
              </span>
              <span className={`${styles.kpiBadge} ${styles.badgeFail}`}>
                Live Risk
              </span>
            </div>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{stats.stageUnusablePct}%</span>
              {deltas && (
                <span
                  className={`${styles.deltaBadge} ${
                    deltas.unusableDelta < 0
                      ? styles.deltaGood
                      : deltas.unusableDelta > 0
                        ? styles.deltaBad
                        : styles.deltaNeutral
                  }`}
                >
                  {deltas.unusableDelta > 0
                    ? `+${deltas.unusableDelta}% 🔴`
                    : deltas.unusableDelta < 0
                      ? `${deltas.unusableDelta}% 🟢`
                      : `0%`}
                </span>
              )}
            </div>
            <div className={styles.kpiMeta}>
              {stats.stageUnusableCount} miar grożących rozjazdem uderzeń na
              żywo
            </div>
          </div>
        </>
      )}

      {/* Mean / Stats KPI */}
      <div className={`${styles.kpiCard} ${styles.kpiCardStats}`}>
        <div className={styles.kpiHeader}>
          <span className={styles.kpiLabel}>📈 Statystyki Błędu</span>
          <span className={`${styles.kpiBadge} ${styles.badgeStats}`}>
            Mean / p50 / p95
          </span>
        </div>
        <div className={styles.kpiValueRow}>
          <span className={styles.kpiValue}>{stats.avgErrorMs} ms</span>
          {deltas && (
            <span
              className={`${styles.deltaBadge} ${
                deltas.meanDelta < 0
                  ? styles.deltaGood
                  : deltas.meanDelta > 0
                    ? styles.deltaBad
                    : styles.deltaNeutral
              }`}
              title={`Δ vs baseline ${deltas.baseMeanMs} ms`}
            >
              {deltas.meanDelta < 0
                ? `${deltas.meanDelta} ms 🟢`
                : deltas.meanDelta > 0
                  ? `+${deltas.meanDelta} ms 🔴`
                  : `0 ms`}
            </span>
          )}
        </div>
        <div className={styles.kpiMeta}>
          Mediana: {stats.medianErrorMs} ms | p95: {stats.p95ErrorMs} ms
        </div>
      </div>
    </div>
  );
}
