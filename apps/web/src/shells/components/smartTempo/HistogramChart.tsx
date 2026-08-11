import React from "react";
import styles from "../SmartTempoAccuracyDashboard.module.css";
import type { HistogramBin } from "./chartTypes.js";

export function HistogramChart({
  gradeMode,
  histogramData,
}: {
  gradeMode: "daw" | "stage";
  histogramData: HistogramBin[];
}) {
  return (
    <div className={styles.chartCard}>
      <div>
        <h3 className={styles.chartTitle}>
          A. Histogram Błędów w Nieliniowych Przedziałach (
          {gradeMode === "daw" ? "DAW Grade" : "Stage-Ready Grade"})
        </h3>
        <p className={styles.chartDesc}>
          {gradeMode === "daw"
            ? "Rozkład odchyleń siatki z podziałem studio DAW (≤60ms exact, ≤125ms close)"
            : "Rozkład odchyleń siatki z podziałem estradowym (≤15ms perfect IEM, ≤35ms DMX safe)"}
        </p>
      </div>

      <div className={styles.histogramWrap}>
        <div className={styles.histogramBars}>
          {histogramData.map((bin, idx) => {
            const maxPct = Math.max(...histogramData.map((b) => b.pct), 1);
            const heightPct = Math.max(8, (bin.pct / maxPct) * 100);

            const activeTier =
              gradeMode === "daw" ? bin.dawTier : bin.stageTier;
            const fillClass =
              activeTier === "exact" || activeTier === "stage-perfect"
                ? styles.barFillExact
                : activeTier === "close" || activeTier === "stage-acceptable"
                  ? styles.barFillClose
                  : styles.barFillFail;

            return (
              <div key={idx} className={styles.histogramCol}>
                <div className={styles.barValueTag}>{bin.pct}%</div>
                <div className={styles.barValueSub}>({bin.count})</div>
                <div
                  className={`${styles.barFill} ${fillClass}`}
                  style={{ height: `${heightPct}%` }}
                  title={`${bin.label}: ${bin.count} miar (${bin.pct}%)`}
                />
                <div className={styles.histogramLabel}>{bin.label}</div>
              </div>
            );
          })}
        </div>

        <div className={styles.thresholdLegend}>
          {gradeMode === "daw" ? (
            <>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.dotExact}`} />
                🟢 Dokładne (≤ 60 ms)
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.dotClose}`} />
                🟡 Tolerancja (60–125 ms)
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.dotFail}`} />
                🔴 Błąd (&gt; 125 ms)
              </div>
            </>
          ) : (
            <>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.dotExact}`} />
                🟢 Stage Perfect (≤ 15 ms)
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.dotClose}`} />
                🟡 Stage Acceptable (15–35 ms)
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.dotFail}`} />
                🔴 Stage Unusable (&gt; 35 ms)
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
