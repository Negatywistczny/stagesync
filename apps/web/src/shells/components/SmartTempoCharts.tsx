import React from "react";
import type {
  BarDataPoint,
  DawTier,
  StageTier,
} from "./SmartTempoAccuracyDashboard.js";
import styles from "./SmartTempoAccuracyDashboard.module.css";

// --- Types ---
export type HistogramBin = {
  label: string;
  min: number;
  max: number;
  dawTier: DawTier;
  stageTier: StageTier;
  count: number;
  pct: number;
};

export type CdfSvgPath = {
  area: string;
  path: string;
};

export type TempoChartData = {
  minBpm: number;
  maxBpm: number;
  bpmRange: number;
  refPath: string;
  estPath: string;
  segments: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    deltaBpm: number;
    tier: string;
  }[];
  points: {
    bar: BarDataPoint;
    x: number;
    yEst: number;
    yRef: number;
    deltaBpm: number;
    tier: string;
  }[];
};

export type SmartTempoStats = {
  stagePerfectPct: number;
  stageAcceptablePct: number;
  exactPct: number;
  closePct: number;
  avgErrorMs: number;
};

// --- Components ---

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
