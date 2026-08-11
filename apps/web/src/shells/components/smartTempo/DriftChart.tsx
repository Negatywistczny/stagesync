import React from "react";
import type { BarDataPoint } from "../SmartTempoAccuracyDashboard.js";
import styles from "../SmartTempoAccuracyDashboard.module.css";
import type { SmartTempoStats } from "./chartTypes.js";

export function DriftChart({
  gradeMode,
  activeBars,
  stats,
  showHistoryOverlay,
  compareRun,
  setHoveredPoint,
  setTooltipPos,
}: {
  gradeMode: "daw" | "stage";
  activeBars: BarDataPoint[];
  stats: SmartTempoStats;
  showHistoryOverlay: boolean;
  compareRun: any;
  setHoveredPoint: (pt: BarDataPoint | null) => void;
  setTooltipPos: (pos: { x: number; y: number } | null) => void;
}) {
  return (
    <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
      <div className={styles.chartTitleRow}>
        <div>
          <h3 className={styles.chartTitle}>
            C. Wykres Przebiegu Odchyleń w Czasie (Timeline Drift Plot)
          </h3>
          <p className={styles.chartDesc}>
            Odchylenie fazowe każdego taktu w czasie utworu (sekundy) z pasmami
            tolerancji (
            {gradeMode === "daw" ? "DAW Grade" : "Stage-Ready Grade"})
          </p>
        </div>
      </div>

      <div className={styles.svgChartWrap} style={{ height: "240px" }}>
        <svg
          viewBox="0 0 800 220"
          className={styles.svgChart}
          preserveAspectRatio="none"
        >
          {gradeMode === "daw" ? (
            <>
              <rect
                x="0"
                y="146.6"
                width="800"
                height="73.4"
                fill="rgba(16, 185, 129, 0.08)"
              />
              <rect
                x="0"
                y="67.2"
                width="800"
                height="79.4"
                fill="rgba(245, 158, 11, 0.08)"
              />
              <rect
                x="0"
                y="0"
                width="800"
                height="67.2"
                fill="rgba(239, 68, 68, 0.08)"
              />

              <line
                x1="0"
                y1="146.6"
                x2="800"
                y2="146.6"
                stroke="rgba(16, 185, 129, 0.3)"
                strokeDasharray="4 4"
              />
              <line
                x1="0"
                y1="67.2"
                x2="800"
                y2="67.2"
                stroke="rgba(245, 158, 11, 0.3)"
                strokeDasharray="4 4"
              />

              <text
                x="790"
                y="140"
                textAnchor="end"
                fill="#34D399"
                fontSize="10"
                fontWeight="600"
                opacity="0.65"
              >
                🟢 DAW EXACT (≤ 60 ms)
              </text>
              <text
                x="790"
                y="62"
                textAnchor="end"
                fill="#FBBF24"
                fontSize="10"
                fontWeight="600"
                opacity="0.65"
              >
                🟡 DAW CLOSE (60–125 ms)
              </text>
              <text
                x="790"
                y="16"
                textAnchor="end"
                fill="#F87171"
                fontSize="10"
                fontWeight="600"
                opacity="0.65"
              >
                🔴 DAW FAIL (&gt; 125 ms)
              </text>
            </>
          ) : (
            <>
              <rect
                x="0"
                y="201.7"
                width="800"
                height="18.3"
                fill="rgba(16, 185, 129, 0.12)"
              />
              <rect
                x="0"
                y="181.1"
                width="800"
                height="20.6"
                fill="rgba(245, 158, 11, 0.12)"
              />
              <rect
                x="0"
                y="0"
                width="800"
                height="181.1"
                fill="rgba(239, 68, 68, 0.08)"
              />

              <line
                x1="0"
                y1="201.7"
                x2="800"
                y2="201.7"
                stroke="rgba(16, 185, 129, 0.4)"
                strokeDasharray="4 4"
              />
              <line
                x1="0"
                y1="181.1"
                x2="800"
                y2="181.1"
                stroke="rgba(245, 158, 11, 0.4)"
                strokeDasharray="4 4"
              />

              <text
                x="790"
                y="198"
                textAnchor="end"
                fill="#34D399"
                fontSize="10"
                fontWeight="600"
                opacity="0.65"
              >
                🟢 STAGE PERFECT (≤ 15 ms)
              </text>
              <text
                x="790"
                y="177"
                textAnchor="end"
                fill="#FBBF24"
                fontSize="10"
                fontWeight="600"
                opacity="0.65"
              >
                🟡 STAGE ACCEPTABLE (15–35 ms)
              </text>
              <text
                x="790"
                y="16"
                textAnchor="end"
                fill="#F87171"
                fontSize="10"
                fontWeight="600"
                opacity="0.65"
              >
                🔴 STAGE UNUSABLE (&gt; 35 ms)
              </text>
            </>
          )}

          {showHistoryOverlay && compareRun && activeBars.length > 1 && (
            <path
              d={activeBars
                .map((bar, i) => {
                  const maxTime = Math.max(
                    ...activeBars.map((b) => b.timeSec),
                    1,
                  );
                  const x = (bar.timeSec / maxTime) * 780 + 10;
                  const maxErr = 180;
                  const baseMean = compareRun.summary.meanMs;
                  const simErr = Math.min(
                    maxErr,
                    Math.max(
                      5,
                      bar.errorMs * (baseMean / Math.max(1, stats.avgErrorMs)),
                    ),
                  );
                  const y = 220 - (simErr / maxErr) * 200;
                  const isStartOfTrack =
                    i === 0 || bar.trackName !== activeBars[i - 1]?.trackName;
                  return `${isStartOfTrack ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(" ")}
              className={styles.compareLine}
            />
          )}

          {activeBars.length > 1 && (
            <path
              d={activeBars
                .map((bar, i) => {
                  const maxTime = Math.max(
                    ...activeBars.map((b) => b.timeSec),
                    1,
                  );
                  const x = (bar.timeSec / maxTime) * 780 + 10;
                  const maxErr = 180;
                  const clampedErr = Math.min(maxErr, bar.errorMs);
                  const y = 220 - (clampedErr / maxErr) * 200;
                  const isStartOfTrack =
                    i === 0 || bar.trackName !== activeBars[i - 1]?.trackName;
                  return `${isStartOfTrack ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(" ")}
              className={styles.driftLine}
            />
          )}

          {activeBars.map((bar, idx) => {
            const maxTime = Math.max(...activeBars.map((b) => b.timeSec), 1);
            const x = (bar.timeSec / maxTime) * 780 + 10;
            const maxErr = 180;
            const clampedErr = Math.min(maxErr, bar.errorMs);
            const y = 220 - (clampedErr / maxErr) * 200;

            const activeTier =
              gradeMode === "daw"
                ? bar.tier
                : (bar.stageTier ??
                  (bar.errorMs <= 15
                    ? "stage-perfect"
                    : bar.errorMs <= 35
                      ? "stage-acceptable"
                      : "stage-unusable"));

            const pointClass =
              activeTier === "exact" || activeTier === "stage-perfect"
                ? styles.driftPointExact
                : activeTier === "close" || activeTier === "stage-acceptable"
                  ? styles.driftPointClose
                  : styles.driftPointFail;

            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r={1.5}
                className={`${styles.driftPoint} ${pointClass}`}
                onMouseEnter={(e) => {
                  setHoveredPoint(bar);
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
