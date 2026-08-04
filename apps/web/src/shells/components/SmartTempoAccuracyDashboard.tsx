/**
 * SmartTempoAccuracyDashboard — Professional Dark Mode Visualization Module
 * Compares Smart Tempo period timing accuracy against DAW Logic Pro reference.
 * Features Regression Tracking, Baseline Comparison, and Dual-Tier Evaluation:
 *   - DAW Grade: Broad studio evaluation (≤60ms / ≤125ms)
 *   - Stage-Ready Grade: Strict live performance evaluation (≤15ms IEM Flam / ≤35ms DMX Sync)
 */

import React, { useMemo, useState } from "react";
import styles from "./SmartTempoAccuracyDashboard.module.css";
import benchmarkDataRaw from "../../lib/smartTempoBenchmarkData.json";
import benchmarkHistoryRaw from "../../lib/smartTempoBenchmarkHistory.json";

export type StageTier = "stage-perfect" | "stage-acceptable" | "stage-unusable";
export type DawTier = "exact" | "close" | "fail";

export type BarDataPoint = {
  trackName: string;
  bar: number;
  timeSec: number;
  refBpm: number;
  estBpm: number;
  refBarMs: number;
  estBarMs: number;
  errorMs: number;
  tier: DawTier;
  stageTier?: StageTier;
};

export type TrackBenchmarkDataset = {
  id: string;
  name: string;
  artist: string;
  durationSec: number;
  barsCount: number;
  exactPct: number;
  closePct: number;
  failPct: number;
  avgErrorMs: number;
  medianErrorMs: number;
  p95ErrorMs: number;
  dawGrade?: { exactPct: number; closePct: number; failPct: number };
  stageGrade?: { perfectPct: number; acceptablePct: number; unusablePct: number };
  bars: BarDataPoint[];
};

export type BenchmarkHistoryEntry = {
  id: string;
  timestamp: string;
  gitCommit: string;
  note: string;
  summary: {
    totalMeasures: number;
    exactPct: number;
    closePct: number;
    failPct: number;
    meanMs: number;
    medianMs: number;
    p95Ms: number;
    dawGrade?: { exactPct: number; closePct: number; failPct: number };
    stageGrade?: { perfectPct: number; acceptablePct: number; unusablePct: number };
  };
  perSong?: Record<
    string,
    {
      exactPct: number;
      meanMs: number;
      stageGrade?: { perfectPct: number; acceptablePct: number; unusablePct: number };
    }
  >;
};

const DEFAULT_DATASET = benchmarkDataRaw as unknown as TrackBenchmarkDataset[];
const DEFAULT_HISTORY = benchmarkHistoryRaw as unknown as BenchmarkHistoryEntry[];

export type SmartTempoAccuracyDashboardProps = {
  /** Optional custom dataset to display instead of the default benchmark tracks. */
  dataset?: TrackBenchmarkDataset[];
  /** Optional benchmark history runs for regression comparison. */
  history?: BenchmarkHistoryEntry[];
  /** Optional title override. */
  title?: string;
  /** Optional container class name. */
  className?: string;
};

// Non-linear bin definitions — bin boundaries align with tier thresholds
const HISTOGRAM_BINS = [
  { label: "0–15ms", min: 0, max: 15.05, dawTier: "exact", stageTier: "stage-perfect" },
  { label: "15–30ms", min: 15.05, max: 30, dawTier: "exact", stageTier: "stage-acceptable" },
  { label: "30–60ms", min: 30, max: 60.05, dawTier: "exact", stageTier: "stage-unusable" },
  { label: "60–90ms", min: 60.05, max: 90, dawTier: "close", stageTier: "stage-unusable" },
  { label: "90–125ms", min: 90, max: 125.05, dawTier: "close", stageTier: "stage-unusable" },
  { label: "125–250ms", min: 125.05, max: 250, dawTier: "fail", stageTier: "stage-unusable" },
  { label: ">250ms", min: 250, max: Infinity, dawTier: "fail", stageTier: "stage-unusable" },
] as const;

export function SmartTempoAccuracyDashboard({
  dataset = DEFAULT_DATASET,
  history = DEFAULT_HISTORY,
  title = "Smart Tempo vs Logic Pro — Wizualizacja Dokładności Siatki Taktowej",
  className,
}: SmartTempoAccuracyDashboardProps) {
  const [selectedTrackId, setSelectedTrackId] = useState<string>("all");
  const [selectedCompareId, setSelectedCompareId] = useState<string>(
    history.length > 0 ? history[0]!.id : "none",
  );
  const [gradeMode, setGradeMode] = useState<"daw" | "stage">("daw");
  const [showHistoryOverlay, setShowHistoryOverlay] = useState<boolean>(false);
  const [hoveredPoint, setHoveredPoint] = useState<BarDataPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Active dataset filtering
  const activeBars = useMemo(() => {
    if (selectedTrackId === "all") {
      return dataset.flatMap((t) => t.bars);
    }
    const track = dataset.find((t) => t.id === selectedTrackId);
    return track ? track.bars : [];
  }, [dataset, selectedTrackId]);

  // Aggregate KPI Calculations for current run (Dual-Tier)
  const stats = useMemo(() => {
    const total = activeBars.length;
    if (total === 0) {
      return {
        total: 0,
        exactCount: 0,
        closeCount: 0,
        failCount: 0,
        exactPct: 0,
        closePct: 0,
        failPct: 0,
        stagePerfectCount: 0,
        stageAcceptableCount: 0,
        stageUnusableCount: 0,
        stagePerfectPct: 0,
        stageAcceptablePct: 0,
        stageUnusablePct: 0,
        avgErrorMs: 0,
        medianErrorMs: 0,
        p95ErrorMs: 0,
      };
    }

    // DAW Grade
    const exactCount = activeBars.filter((b) => b.errorMs <= 60).length;
    const closeCount = activeBars.filter((b) => b.errorMs > 60 && b.errorMs <= 125).length;
    const failCount = activeBars.filter((b) => b.errorMs > 125).length;

    // Stage-Ready Grade
    const stagePerfectCount = activeBars.filter((b) => b.errorMs <= 15).length;
    const stageAcceptableCount = activeBars.filter((b) => b.errorMs > 15 && b.errorMs <= 35).length;
    const stageUnusableCount = activeBars.filter((b) => b.errorMs > 35).length;

    const errorsSorted = activeBars.map((b) => b.errorMs).sort((a, b) => a - b);
    const sumErr = errorsSorted.reduce((a, b) => a + b, 0);

    const medianErrorMs = errorsSorted[Math.floor(total * 0.5)] ?? 0;
    const p95ErrorMs = errorsSorted[Math.floor(total * 0.95)] ?? 0;

    return {
      total,
      exactCount,
      closeCount,
      failCount,
      exactPct: Math.round((exactCount / total) * 1000) / 10,
      closePct: Math.round((closeCount / total) * 1000) / 10,
      failPct: Math.round((failCount / total) * 1000) / 10,

      stagePerfectCount,
      stageAcceptableCount,
      stageUnusableCount,
      stagePerfectPct: Math.round((stagePerfectCount / total) * 1000) / 10,
      stageAcceptablePct: Math.round((stageAcceptableCount / total) * 1000) / 10,
      stageUnusablePct: Math.round((stageUnusableCount / total) * 1000) / 10,

      avgErrorMs: Math.round((sumErr / total) * 10) / 10,
      medianErrorMs: Math.round(medianErrorMs * 10) / 10,
      p95ErrorMs: Math.round(p95ErrorMs * 10) / 10,
    };
  }, [activeBars]);

  // Comparison Baseline Run lookup
  const compareRun = useMemo(() => {
    if (selectedCompareId === "none") return null;
    return history.find((h) => h.id === selectedCompareId) ?? null;
  }, [history, selectedCompareId]);

  // Delta calculations vs selected comparison baseline run
  const deltas = useMemo(() => {
    if (!compareRun) return null;

    let baseExactPct = compareRun.summary.dawGrade?.exactPct ?? compareRun.summary.exactPct;
    let baseClosePct = compareRun.summary.dawGrade?.closePct ?? compareRun.summary.closePct;
    let baseFailPct = compareRun.summary.dawGrade?.failPct ?? compareRun.summary.failPct;

    let basePerfectPct = compareRun.summary.stageGrade?.perfectPct ?? 15.0;
    let baseAcceptablePct = compareRun.summary.stageGrade?.acceptablePct ?? 25.0;
    let baseUnusablePct = compareRun.summary.stageGrade?.unusablePct ?? 60.0;

    let baseMeanMs = compareRun.summary.meanMs;

    // If specific track selected and compareRun has perSong statistics
    if (selectedTrackId !== "all" && compareRun.perSong) {
      const track = dataset.find((t) => t.id === selectedTrackId);
      if (track && compareRun.perSong[track.name]) {
        const songStat = compareRun.perSong[track.name]!;
        baseExactPct = songStat.exactPct;
        baseMeanMs = songStat.meanMs;
        if (songStat.stageGrade) {
          basePerfectPct = songStat.stageGrade.perfectPct;
          baseAcceptablePct = songStat.stageGrade.acceptablePct;
          baseUnusablePct = songStat.stageGrade.unusablePct;
        }
      }
    }

    const exactDelta = Math.round((stats.exactPct - baseExactPct) * 10) / 10;
    const closeDelta = Math.round((stats.closePct - baseClosePct) * 10) / 10;
    const failDelta = Math.round((stats.failPct - baseFailPct) * 10) / 10;

    const perfectDelta = Math.round((stats.stagePerfectPct - basePerfectPct) * 10) / 10;
    const acceptableDelta = Math.round((stats.stageAcceptablePct - baseAcceptablePct) * 10) / 10;
    const unusableDelta = Math.round((stats.stageUnusablePct - baseUnusablePct) * 10) / 10;

    const meanDelta = Math.round((stats.avgErrorMs - baseMeanMs) * 10) / 10;

    return {
      exactDelta,
      closeDelta,
      failDelta,
      perfectDelta,
      acceptableDelta,
      unusableDelta,
      meanDelta,
      baseExactPct,
      basePerfectPct,
      baseMeanMs,
    };
  }, [compareRun, selectedTrackId, dataset, stats]);

  // Histogram Data Calculation
  const histogramData = useMemo(() => {
    const total = activeBars.length;
    return HISTOGRAM_BINS.map((bin) => {
      const count = activeBars.filter((b) => {
        if (bin.max === Infinity) return b.errorMs > bin.min;
        return b.errorMs >= bin.min && b.errorMs < bin.max;
      }).length;
      const pct = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
      return { ...bin, count, pct };
    });
  }, [activeBars]);

  // CDF Data Curve Calculation (0 to 180 ms)
  const cdfPoints = useMemo(() => {
    const total = activeBars.length;
    if (total === 0) return [];

    const errorsSorted = activeBars.map((b) => b.errorMs).sort((a, b) => a - b);
    const steps: { ms: number; pct: number }[] = [];

    for (let ms = 0; ms <= 180; ms += 2) {
      const count = errorsSorted.filter((e) => e <= ms).length;
      const pct = Math.round((count / total) * 1000) / 10;
      steps.push({ ms, pct });
    }
    return steps;
  }, [activeBars]);

  // SVG Path Generator for CDF Chart
  const cdfSvgPath = useMemo(() => {
    if (cdfPoints.length === 0) return { path: "", area: "" };

    const width = 400;
    const height = 180;
    const maxMs = 180;

    const points = cdfPoints.map((pt) => {
      const x = (pt.ms / maxMs) * width;
      const y = height - (pt.pct / 100) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathD = `M ${points.join(" L ")}`;
    const areaD = `M 0,${height} L ${points.join(" L ")} L ${width},${height} Z`;

    return { path: pathD, area: areaD };
  }, [cdfPoints]);

  return (
    <div className={`${styles.container} ${className ?? ""}`}>
      {/* Header & Controls Section (Two Rows) */}
      <div className={styles.header}>
        {/* Row 1: Title, Subtitle, Grade Mode Switcher, Baseline Selector */}
        <div className={styles.headerRow1}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>
              {title}
              <span className={styles.badgeHeader}>Logic Pro SSOT</span>
            </h2>
            <p className={styles.subtitle}>
              Porównanie odchyleń siatki Smart Tempo z Logic Pro. Ocena dwupoziomowa: Studio DAW vs Estradowa Live.
            </p>
          </div>

          <div className={styles.headerControlsRight}>
            {/* Dual-Tier Metric Grade Mode Switch */}
            <div className={styles.gradeModeToggle} role="tablist" aria-label="Tryb oceny metryk">
              <button
                type="button"
                className={`${styles.gradeModeBtn} ${
                  gradeMode === "daw" ? styles.gradeModeActiveDaw : ""
                }`}
                onClick={() => setGradeMode("daw")}
                title="Kryteria DAW Grade: Exact ≤60ms (1/32 nuta), Close 60-125ms"
              >
                🎛️ DAW Grade (≤60ms)
              </button>
              <button
                type="button"
                className={`${styles.gradeModeBtn} ${
                  gradeMode === "stage" ? styles.gradeModeActiveStage : ""
                }`}
                onClick={() => setGradeMode("stage")}
                title="Kryteria Estradowe: Stage Perfect ≤15ms (Brak flamu IEM), Acceptable 15-35ms (DMX/Live)"
              >
                🎤 Stage-Ready Grade (≤15ms)
              </button>
            </div>

            {/* Baseline Comparison Select */}
            {history.length > 0 && (
              <select
                aria-label="Wersja odniesienia (Baseline)"
                className={styles.compareSelect}
                value={selectedCompareId}
                onChange={(e) => setSelectedCompareId(e.target.value)}
              >
                <option value="none">Brak porównania (Single Run)</option>
                {history.map((h, i) => (
                  <option key={h.id} value={h.id}>
                    {i === 0 ? "⚡ Wersja Bazowa: " : "📜 "}
                    {h.note.length > 30 ? `${h.note.slice(0, 30)}…` : h.note} ({h.gitCommit} · Exact {h.summary.exactPct}%)
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Row 2: Track Selector Pills Bar */}
        <div className={styles.headerRow2}>
          <div className={styles.trackSelector} role="tablist" aria-label="Wybór utworu">
            <button
              type="button"
              className={`${styles.trackBtn} ${selectedTrackId === "all" ? styles.trackBtnActive : ""}`}
              onClick={() => setSelectedTrackId("all")}
            >
              Wszystkie ({DEFAULT_DATASET.reduce((sum, t) => sum + t.barsCount, 0)} miar)
            </button>
            {dataset.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`${styles.trackBtn} ${selectedTrackId === t.id ? styles.trackBtnActive : ""}`}
                onClick={() => setSelectedTrackId(t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards Section */}
      <div className={styles.kpiGrid}>
        {gradeMode === "daw" ? (
          <>
            {/* DAW Exact KPI */}
            <div className={`${styles.kpiCard} ${styles.kpiCardExact}`}>
              <div className={styles.kpiHeader}>
                <span className={styles.kpiLabel}>🟢 Dokładne (≤ 60 ms)</span>
                <span className={`${styles.kpiBadge} ${styles.badgeExact}`}>DAW Grade</span>
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
                    {deltas.exactDelta > 0 ? `+${deltas.exactDelta}% 🟢` : deltas.exactDelta < 0 ? `${deltas.exactDelta}% 🔴` : `0%`}
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
                <span className={`${styles.kpiBadge} ${styles.badgeClose}`}>Rubato</span>
              </div>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>{stats.closePct}%</span>
                {deltas && (
                  <span
                    className={`${styles.deltaBadge} ${
                      deltas.closeDelta < 0 ? styles.deltaGood : deltas.closeDelta > 0 ? styles.deltaBad : styles.deltaNeutral
                    }`}
                  >
                    {deltas.closeDelta > 0 ? `+${deltas.closeDelta}%` : deltas.closeDelta < 0 ? `${deltas.closeDelta}%` : `0%`}
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
                    {deltas.failDelta > 0 ? `+${deltas.failDelta}% 🔴` : deltas.failDelta < 0 ? `${deltas.failDelta}% 🟢` : `0%`}
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
                <span className={styles.kpiLabel}>🟢 Stage Perfect (≤ 15 ms)</span>
                <span className={`${styles.kpiBadge} ${styles.badgeExact}`}>IEM Safe</span>
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
                    {deltas.perfectDelta > 0 ? `+${deltas.perfectDelta}% 🟢` : deltas.perfectDelta < 0 ? `${deltas.perfectDelta}% 🔴` : `0%`}
                  </span>
                )}
              </div>
              <div className={styles.kpiMeta}>
                {stats.stagePerfectCount} z {stats.total} miar (Zero IEM flam / Konzert-ready)
              </div>
            </div>

            {/* Stage Acceptable KPI */}
            <div className={`${styles.kpiCard} ${styles.kpiCardClose}`}>
              <div className={styles.kpiHeader}>
                <span className={styles.kpiLabel}>🟡 Stage Acceptable (15–35 ms)</span>
                <span className={`${styles.kpiBadge} ${styles.badgeClose}`}>DMX Safe</span>
              </div>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>{stats.stageAcceptablePct}%</span>
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
                    {deltas.acceptableDelta > 0 ? `+${deltas.acceptableDelta}%` : deltas.acceptableDelta < 0 ? `${deltas.acceptableDelta}%` : `0%`}
                  </span>
                )}
              </div>
              <div className={styles.kpiMeta}>
                {stats.stageAcceptableCount} miar z mikro-rubato bezpiecznym dla sekcji i świateł
              </div>
            </div>

            {/* Stage Unusable KPI */}
            <div className={`${styles.kpiCard} ${styles.kpiCardFail}`}>
              <div className={styles.kpiHeader}>
                <span className={styles.kpiLabel}>🔴 Stage Unusable (&gt; 35 ms)</span>
                <span className={`${styles.kpiBadge} ${styles.badgeFail}`}>Live Risk</span>
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
                    {deltas.unusableDelta > 0 ? `+${deltas.unusableDelta}% 🔴` : deltas.unusableDelta < 0 ? `${deltas.unusableDelta}% 🟢` : `0%`}
                  </span>
                )}
              </div>
              <div className={styles.kpiMeta}>
                {stats.stageUnusableCount} miar grożących rozjazdem uderzeń na żywo
              </div>
            </div>
          </>
        )}

        {/* Mean / Stats KPI */}
        <div className={`${styles.kpiCard} ${styles.kpiCardStats}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>📈 Statystyki Błędu</span>
            <span className={`${styles.kpiBadge} ${styles.badgeStats}`}>Mean / p50 / p95</span>
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
                {deltas.meanDelta < 0 ? `${deltas.meanDelta} ms 🟢` : deltas.meanDelta > 0 ? `+${deltas.meanDelta} ms 🔴` : `0 ms`}
              </span>
            )}
          </div>
          <div className={styles.kpiMeta}>
            Mediana: {stats.medianErrorMs} ms | p95: {stats.p95ErrorMs} ms
          </div>
        </div>
      </div>

      {/* Main Charts Layout */}
      <div className={styles.chartGrid}>
        {/* Chart A: Histogram with Non-linear Bins */}
        <div className={styles.chartCard}>
          <div>
            <h3 className={styles.chartTitle}>
              A. Histogram Błędów w Nieliniowych Przedziałach ({gradeMode === "daw" ? "DAW Grade" : "Stage-Ready Grade"})
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

                const activeTier = gradeMode === "daw" ? bin.dawTier : bin.stageTier;
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

        {/* Chart B: Cumulative Distribution Function (CDF) — Non-overlapping Labels */}
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
            <svg viewBox="0 0 400 180" className={styles.svgChart} preserveAspectRatio="none">
              <defs>
                <linearGradient id="cdfGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="45" x2="400" y2="45" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <line x1="0" y1="90" x2="400" y2="90" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <line x1="0" y1="135" x2="400" y2="135" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

              {/* Reference Lines with Top Staggered Non-Overlapping Labels */}
              {/* 15ms Reference Line (Stage Perfect) */}
              <line
                x1={(15 / 180) * 400}
                y1="0"
                x2={(15 / 180) * 400}
                y2="180"
                className={styles.refLine}
                stroke="#8B5CF6"
              />
              <text x={(15 / 180) * 400 + 4} y="14" className={styles.refText} fill="#C4B5FD">
                15ms ({stats.stagePerfectPct}%)
              </text>

              {/* 35ms Reference Line (Stage Acceptable) */}
              <line
                x1={(35 / 180) * 400}
                y1="0"
                x2={(35 / 180) * 400}
                y2="180"
                className={styles.refLine}
                stroke="#F59E0B"
              />
              <text x={(35 / 180) * 400 + 4} y="28" className={styles.refText} fill="#FCD34D">
                35ms ({(stats.stagePerfectPct + stats.stageAcceptablePct).toFixed(1)}%)
              </text>

              {/* 60ms Reference Line (DAW Exact) */}
              <line
                x1={(60 / 180) * 400}
                y1="0"
                x2={(60 / 180) * 400}
                y2="180"
                className={`${styles.refLine} ${styles.refLineExact}`}
              />
              <text x={(60 / 180) * 400 + 4} y="14" className={styles.refText} fill="#6EE7B7">
                60ms ({stats.exactPct}%)
              </text>

              {/* 125ms Reference Line (DAW Close) */}
              <line
                x1={(125 / 180) * 400}
                y1="0"
                x2={(125 / 180) * 400}
                y2="180"
                className={`${styles.refLine} ${styles.refLineClose}`}
              />
              <text x={(125 / 180) * 400 + 4} y="28" className={styles.refText} fill="#FCD34D">
                125ms ({(stats.exactPct + stats.closePct).toFixed(1)}%)
              </text>

              {/* Area & Path */}
              <path d={cdfSvgPath.area} className={styles.cdfArea} />
              <path d={cdfSvgPath.path} className={styles.cdfLine} />
            </svg>

            <div className={styles.thresholdLegend}>
              <span className={styles.legendItem}>
                Progi skumulowane: ≤15 ms: <strong>{stats.stagePerfectPct}%</strong>
                {" · "}≤35 ms: <strong>{(stats.stagePerfectPct + stats.stageAcceptablePct).toFixed(1)}%</strong>
                {" · "}≤60 ms: <strong>{stats.exactPct}%</strong>
                {" · "}≤125 ms: <strong>{(stats.exactPct + stats.closePct).toFixed(1)}%</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Chart C: Cleaned Timeline Drift Plot */}
        <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
          <div className={styles.chartTitleRow}>
            <div>
              <h3 className={styles.chartTitle}>
                C. Wykres Przebiegu Odchyleń w Czasie (Timeline Drift Plot)
              </h3>
              <p className={styles.chartDesc}>
                Odchylenie fazowe każdego taktu w czasie utworu (sekundy) z pasmami tolerancji ({gradeMode === "daw" ? "DAW Grade" : "Stage-Ready Grade"})
              </p>
            </div>

            <div className={styles.chartControls}>
              {compareRun && (
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    className={styles.checkboxInput}
                    checked={showHistoryOverlay}
                    onChange={(e) => setShowHistoryOverlay(e.target.checked)}
                  />
                  Pokaż nakładkę historii ({compareRun.note.slice(0, 20)}…)
                </label>
              )}
            </div>
          </div>

          <div className={styles.svgChartWrap} style={{ height: "240px" }}>
            <svg viewBox="0 0 800 220" className={styles.svgChart} preserveAspectRatio="none">
              {/* Background Color Bands dynamically switching between DAW vs Stage-Ready Mode */}
              {gradeMode === "daw" ? (
                <>
                  {/* Green Zone: 0 to 60 ms */}
                  <rect x="0" y="146.6" width="800" height="73.4" fill="rgba(16, 185, 129, 0.08)" />
                  {/* Yellow Zone: 60 to 125 ms */}
                  <rect x="0" y="67.2" width="800" height="79.4" fill="rgba(245, 158, 11, 0.08)" />
                  {/* Red Zone: > 125 ms */}
                  <rect x="0" y="0" width="800" height="67.2" fill="rgba(239, 68, 68, 0.08)" />

                  <line x1="0" y1="146.6" x2="800" y2="146.6" stroke="rgba(16, 185, 129, 0.3)" strokeDasharray="4 4" />
                  <line x1="0" y1="67.2" x2="800" y2="67.2" stroke="rgba(245, 158, 11, 0.3)" strokeDasharray="4 4" />

                  {/* Clean labels placed at the right edge outside data points */}
                  <text x="790" y="140" textAnchor="end" fill="#34D399" fontSize="10" fontWeight="600" opacity="0.65">
                    🟢 DAW EXACT (≤ 60 ms)
                  </text>
                  <text x="790" y="62" textAnchor="end" fill="#FBBF24" fontSize="10" fontWeight="600" opacity="0.65">
                    🟡 DAW CLOSE (60–125 ms)
                  </text>
                  <text x="790" y="16" textAnchor="end" fill="#F87171" fontSize="10" fontWeight="600" opacity="0.65">
                    🔴 DAW FAIL (&gt; 125 ms)
                  </text>
                </>
              ) : (
                <>
                  {/* Green Zone: 0 to 15 ms */}
                  <rect x="0" y="201.7" width="800" height="18.3" fill="rgba(16, 185, 129, 0.12)" />
                  {/* Yellow Zone: 15 to 35 ms */}
                  <rect x="0" y="181.1" width="800" height="20.6" fill="rgba(245, 158, 11, 0.12)" />
                  {/* Red Zone: > 35 ms */}
                  <rect x="0" y="0" width="800" height="181.1" fill="rgba(239, 68, 68, 0.08)" />

                  <line x1="0" y1="201.7" x2="800" y2="201.7" stroke="rgba(16, 185, 129, 0.4)" strokeDasharray="4 4" />
                  <line x1="0" y1="181.1" x2="800" y2="181.1" stroke="rgba(245, 158, 11, 0.4)" strokeDasharray="4 4" />

                  {/* Clean labels placed at the right edge outside data points */}
                  <text x="790" y="198" textAnchor="end" fill="#34D399" fontSize="10" fontWeight="600" opacity="0.65">
                    🟢 STAGE PERFECT (≤ 15 ms)
                  </text>
                  <text x="790" y="177" textAnchor="end" fill="#FBBF24" fontSize="10" fontWeight="600" opacity="0.65">
                    🟡 STAGE ACCEPTABLE (15–35 ms)
                  </text>
                  <text x="790" y="16" textAnchor="end" fill="#F87171" fontSize="10" fontWeight="600" opacity="0.65">
                    🔴 STAGE UNUSABLE (&gt; 35 ms)
                  </text>
                </>
              )}

              {/* Comparison Baseline Overlay (Subtle shadow line, toggled by checkbox) */}
              {showHistoryOverlay && compareRun && activeBars.length > 1 && (
                <path
                  d={activeBars
                    .map((bar, i) => {
                      const maxTime = Math.max(...activeBars.map((b) => b.timeSec), 1);
                      const x = (bar.timeSec / maxTime) * 780 + 10;
                      const maxErr = 180;
                      const baseMean = compareRun.summary.meanMs;
                      const simErr = Math.min(maxErr, Math.max(5, bar.errorMs * (baseMean / Math.max(1, stats.avgErrorMs))));
                      const y = 220 - (simErr / maxErr) * 200;
                      const isStartOfTrack = i === 0 || bar.trackName !== activeBars[i - 1]?.trackName;
                      return `${isStartOfTrack ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(" ")}
                  className={styles.compareLine}
                />
              )}

              {/* Current Run Clean 1px Connecting Line */}
              {activeBars.length > 1 && (
                <path
                  d={activeBars
                    .map((bar, i) => {
                      const maxTime = Math.max(...activeBars.map((b) => b.timeSec), 1);
                      const x = (bar.timeSec / maxTime) * 780 + 10;
                      const maxErr = 180;
                      const clampedErr = Math.min(maxErr, bar.errorMs);
                      const y = 220 - (clampedErr / maxErr) * 200;
                      const isStartOfTrack = i === 0 || bar.trackName !== activeBars[i - 1]?.trackName;
                      return `${isStartOfTrack ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(" ")}
                  className={styles.driftLine}
                />
              )}

              {/* Current Run Discrete Small Dots (radius 1.5px) */}
              {activeBars.map((bar, idx) => {
                const maxTime = Math.max(...activeBars.map((b) => b.timeSec), 1);
                const x = (bar.timeSec / maxTime) * 780 + 10;
                const maxErr = 180;
                const clampedErr = Math.min(maxErr, bar.errorMs);
                const y = 220 - (clampedErr / maxErr) * 200;

                const activeTier = gradeMode === "daw"
                  ? bar.tier
                  : (bar.stageTier ?? (bar.errorMs <= 15 ? "stage-perfect" : bar.errorMs <= 35 ? "stage-acceptable" : "stage-unusable"));

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
      </div>

      {/* Floating Tooltip */}
      {hoveredPoint && tooltipPos && (
        <div
          className={styles.tooltip}
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <div className={styles.tooltipTitle}>
            {hoveredPoint.trackName} — Takt #{hoveredPoint.bar} ({hoveredPoint.timeSec}s)
          </div>
          <div className={styles.tooltipRow}>
            <span>Odchylenie:</span>
            <strong>{hoveredPoint.errorMs} ms</strong>
          </div>
          <div className={styles.tooltipRow}>
            <span>DAW Grade:</span>
            <span
              style={{
                color:
                  hoveredPoint.tier === "exact"
                    ? "#34D399"
                    : hoveredPoint.tier === "close"
                      ? "#FBBF24"
                      : "#F87171",
              }}
            >
              {hoveredPoint.tier.toUpperCase()} (≤60ms)
            </span>
          </div>
          <div className={styles.tooltipRow}>
            <span>Stage Grade:</span>
            <span
              style={{
                color:
                  hoveredPoint.errorMs <= 15
                    ? "#34D399"
                    : hoveredPoint.errorMs <= 35
                      ? "#FBBF24"
                      : "#F87171",
              }}
            >
              {hoveredPoint.errorMs <= 15
                ? "STAGE PERFECT (≤15ms)"
                : hoveredPoint.errorMs <= 35
                  ? "STAGE ACCEPTABLE (15-35ms)"
                  : "STAGE UNUSABLE (>35ms)"}
            </span>
          </div>
          <div className={styles.tooltipRow}>
            <span>BPM Logic:</span>
            <span>{hoveredPoint.refBpm} BPM</span>
          </div>
          <div className={styles.tooltipRow}>
            <span>BPM Smart Tempo:</span>
            <span>{hoveredPoint.estBpm} BPM</span>
          </div>
        </div>
      )}
    </div>
  );
}
