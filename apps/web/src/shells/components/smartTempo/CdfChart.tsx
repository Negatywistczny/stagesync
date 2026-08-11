import React from "react";
import styles from "../SmartTempoAccuracyDashboard.module.css";
import type { CdfSvgPath, SmartTempoStats } from "./chartTypes.js";

export function CdfChart({
  stats,
  cdfSvgPath,
}: {
  stats: SmartTempoStats;
  cdfSvgPath: CdfSvgPath;
}) {
  return (
    <div className={styles.chartCard}>
      <div>
        <h3 className={styles.chartTitle}>
          B. Wykres Skumulowanej Dokładności (CDF)
        </h3>
        <p className={styles.chartDesc}>
          Skumulowany procent miar taktowych w zależności od progu błędu ms
        </p>
      </div>

      <div className={styles.svgChartWrap}>
        <svg
          viewBox="0 0 400 180"
          className={styles.svgChart}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="cdfGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <line
            x1="0"
            y1="45"
            x2="400"
            y2="45"
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 3"
          />
          <line
            x1="0"
            y1="90"
            x2="400"
            y2="90"
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 3"
          />
          <line
            x1="0"
            y1="135"
            x2="400"
            y2="135"
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 3"
          />

          <line
            x1={(15 / 180) * 400}
            y1="0"
            x2={(15 / 180) * 400}
            y2="180"
            className={styles.refLine}
            stroke="#8B5CF6"
          />
          <text
            x={(15 / 180) * 400 + 4}
            y="14"
            className={styles.refText}
            fill="#C4B5FD"
          >
            15ms ({stats.stagePerfectPct}%)
          </text>

          <line
            x1={(35 / 180) * 400}
            y1="0"
            x2={(35 / 180) * 400}
            y2="180"
            className={styles.refLine}
            stroke="#F59E0B"
          />
          <text
            x={(35 / 180) * 400 + 4}
            y="28"
            className={styles.refText}
            fill="#FCD34D"
          >
            35ms (
            {(stats.stagePerfectPct + stats.stageAcceptablePct).toFixed(1)}
            %)
          </text>

          <line
            x1={(60 / 180) * 400}
            y1="0"
            x2={(60 / 180) * 400}
            y2="180"
            className={`${styles.refLine} ${styles.refLineExact}`}
          />
          <text
            x={(60 / 180) * 400 + 4}
            y="14"
            className={styles.refText}
            fill="#6EE7B7"
          >
            60ms ({stats.exactPct}%)
          </text>

          <line
            x1={(125 / 180) * 400}
            y1="0"
            x2={(125 / 180) * 400}
            y2="180"
            className={`${styles.refLine} ${styles.refLineClose}`}
          />
          <text
            x={(125 / 180) * 400 + 4}
            y="28"
            className={styles.refText}
            fill="#FCD34D"
          >
            125ms ({(stats.exactPct + stats.closePct).toFixed(1)}%)
          </text>

          <path d={cdfSvgPath.area} className={styles.cdfArea} />
          <path d={cdfSvgPath.path} className={styles.cdfLine} />
        </svg>

        <div className={styles.thresholdLegend}>
          <span className={styles.legendItem}>
            Progi skumulowane: ≤15 ms: <strong>{stats.stagePerfectPct}%</strong>
            {" · "}≤35 ms:{" "}
            <strong>
              {(stats.stagePerfectPct + stats.stageAcceptablePct).toFixed(1)}%
            </strong>
            {" · "}≤60 ms: <strong>{stats.exactPct}%</strong>
            {" · "}≤125 ms:{" "}
            <strong>{(stats.exactPct + stats.closePct).toFixed(1)}%</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
