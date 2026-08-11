import React from "react";
import type { BarDataPoint } from "../SmartTempoAccuracyDashboard.js";
import styles from "../SmartTempoAccuracyDashboard.module.css";
import type { TempoChartData } from "./chartTypes.js";

export function ConvergenceChart({
  tempoChartData,
  setHoveredPoint,
  setTooltipPos,
}: {
  tempoChartData: TempoChartData;
  setHoveredPoint: (pt: BarDataPoint | null) => void;
  setTooltipPos: (pos: { x: number; y: number } | null) => void;
}) {
  return (
    <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
      <div className={styles.chartTitleRow}>
        <div>
          <h3 className={styles.chartTitle}>
            D. Wykres Przebiegu Tempa w Czasie (Tempo Contour & Convergence
            Plot)
          </h3>
          <p className={styles.chartDesc}>
            Wartość tempa (BPM) w czasie utworu: linia Smart Tempo (wyliczona)
            vs Logic Pro SSOT (referencja) z oznaczonym poziomem zbieżności
          </p>
        </div>

        <div className={styles.thresholdLegend}>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotRefLine}`} />
            🟣 Referencja Logic Pro
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotExact}`} />
            🟢 Wysoka zbieżność (Δ ≤ 0.5 BPM)
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotClose}`} />
            🟡 Średnia zbieżność (Δ 0.5–2.0 BPM)
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotFail}`} />
            🔴 Rozbieżność (Δ &gt; 2.0 BPM)
          </div>
        </div>
      </div>

      <div className={styles.svgChartWrap} style={{ height: "240px" }}>
        <svg
          viewBox="0 0 800 220"
          className={styles.svgChart}
          preserveAspectRatio="none"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const bpmVal = (
              tempoChartData.maxBpm -
              ratio * tempoChartData.bpmRange
            ).toFixed(1);
            const y = 10 + ratio * 180;
            return (
              <g key={idx}>
                <line
                  x1="0"
                  y1={y}
                  x2="800"
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="3 3"
                />
                <text
                  x="790"
                  y={y - 4}
                  textAnchor="end"
                  fill="rgba(255,255,255,0.4)"
                  fontSize="10"
                  fontWeight="500"
                >
                  {bpmVal} BPM
                </text>
              </g>
            );
          })}

          <path d={tempoChartData.refPath} className={styles.refTempoPath} />

          {tempoChartData.segments.map((seg, idx) => {
            const strokeColor =
              seg.tier === "high"
                ? "#34D399"
                : seg.tier === "med"
                  ? "#FBBF24"
                  : "#F87171";
            return (
              <line
                key={idx}
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                stroke={strokeColor}
                strokeWidth="2"
                strokeLinecap="round"
              />
            );
          })}

          {tempoChartData.points.map((pt, idx) => {
            const pointClass =
              pt.tier === "high"
                ? styles.driftPointExact
                : pt.tier === "med"
                  ? styles.driftPointClose
                  : styles.driftPointFail;

            return (
              <circle
                key={idx}
                cx={pt.x}
                cy={pt.yEst}
                r={2}
                className={`${styles.driftPoint} ${pointClass}`}
                onMouseEnter={(e) => {
                  setHoveredPoint(pt.bar);
                  const rect = (e.target as SVGElement).getBoundingClientRect();
                  setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
                }}
                onMouseLeave={() => {
                  setHoveredPoint(null);
                  setTooltipPos(null);
                }}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
