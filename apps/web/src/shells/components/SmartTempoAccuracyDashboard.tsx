/**
 * SmartTempoAccuracyDashboard — Professional Dark Mode Visualization Module
 * Compares Smart Tempo period timing accuracy against DAW Logic Pro reference.
 * Features Regression Tracking, Baseline Comparison, and Dual-Tier Evaluation:
 *   - DAW Grade: Broad studio evaluation (≤60ms / ≤125ms)
 *   - Stage-Ready Grade: Strict live performance evaluation (≤15ms IEM Flam / ≤35ms DMX Sync)
 */

import React, { useMemo, useState } from "react";
import styles from "./SmartTempoAccuracyDashboard.module.css";
import benchmarkDataRaw from "@lib/audio/smartTempoBenchmarkData.json";
import benchmarkHistoryRaw from "@lib/audio/smartTempoBenchmarkHistory.json";
import {
  HistogramChart,
  CdfChart,
  DriftChart,
  ConvergenceChart,
} from "./SmartTempoCharts.js";


export type {
  StageTier,
  DawTier,
  BarDataPoint,
  TrackBenchmarkDataset,
  BenchmarkHistoryEntry,
  SmartTempoAccuracyDashboardProps,
} from "./smartTempo/dashboardTypes.js";
import type {
  BarDataPoint,
  BenchmarkHistoryEntry,
  SmartTempoAccuracyDashboardProps,
  TrackBenchmarkDataset,
} from "./smartTempo/dashboardTypes.js";
import { HISTOGRAM_BINS } from "./smartTempo/histogramBins.js";
import { DashboardControls } from "./smartTempo/DashboardControls.js";
import { DashboardKpiCards } from "./smartTempo/DashboardKpiCards.js";

const DEFAULT_DATASET = benchmarkDataRaw as unknown as TrackBenchmarkDataset[];
const DEFAULT_HISTORY =
  benchmarkHistoryRaw as unknown as BenchmarkHistoryEntry[];


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
  const showHistoryOverlay = false;
  const [hoveredPoint, setHoveredPoint] = useState<BarDataPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null,
  );

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
    const closeCount = activeBars.filter(
      (b) => b.errorMs > 60 && b.errorMs <= 125,
    ).length;
    const failCount = activeBars.filter((b) => b.errorMs > 125).length;

    // Stage-Ready Grade
    const stagePerfectCount = activeBars.filter((b) => b.errorMs <= 15).length;
    const stageAcceptableCount = activeBars.filter(
      (b) => b.errorMs > 15 && b.errorMs <= 35,
    ).length;
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
      stageAcceptablePct:
        Math.round((stageAcceptableCount / total) * 1000) / 10,
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

    let baseExactPct =
      compareRun.summary.dawGrade?.exactPct ?? compareRun.summary.exactPct;
    const baseClosePct =
      compareRun.summary.dawGrade?.closePct ?? compareRun.summary.closePct;
    const baseFailPct =
      compareRun.summary.dawGrade?.failPct ?? compareRun.summary.failPct;

    let basePerfectPct = compareRun.summary.stageGrade?.perfectPct ?? 15.0;
    let baseAcceptablePct =
      compareRun.summary.stageGrade?.acceptablePct ?? 25.0;
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

    const perfectDelta =
      Math.round((stats.stagePerfectPct - basePerfectPct) * 10) / 10;
    const acceptableDelta =
      Math.round((stats.stageAcceptablePct - baseAcceptablePct) * 10) / 10;
    const unusableDelta =
      Math.round((stats.stageUnusablePct - baseUnusablePct) * 10) / 10;

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

  // Tempo Range and Curve Calculation for Section D (Tempo Contour & Convergence Plot)
  const tempoChartData = useMemo(() => {
    if (activeBars.length === 0) {
      return {
        minBpm: 100,
        maxBpm: 140,
        bpmRange: 40,
        refPath: "",
        estPath: "",
        segments: [],
        points: [],
      };
    }

    const allBpms = activeBars.flatMap((b) => [b.refBpm, b.estBpm]);
    let minBpm = Math.floor(Math.min(...allBpms) - 2);
    let maxBpm = Math.ceil(Math.max(...allBpms) + 2);
    if (maxBpm - minBpm < 4) {
      minBpm = Math.max(0, minBpm - 3);
      maxBpm = maxBpm + 3;
    }
    const bpmRange = maxBpm - minBpm;

    const maxTime = Math.max(...activeBars.map((b) => b.timeSec), 1);
    const width = 780;
    const xOffset = 10;
    const height = 200;
    const yOffset = 10;

    const getY = (bpm: number) => {
      const norm = (bpm - minBpm) / bpmRange;
      return height - norm * (height - 20) + yOffset;
    };

    const getX = (timeSec: number) => {
      return (timeSec / maxTime) * width + xOffset;
    };

    // Logic SSOT Ref line path
    const refPath = activeBars
      .map((bar, i) => {
        const x = getX(bar.timeSec);
        const y = getY(bar.refBpm);
        const isStartOfTrack =
          i === 0 || bar.trackName !== activeBars[i - 1]?.trackName;
        return `${isStartOfTrack ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    // Smart Tempo Est line path
    const estPath = activeBars
      .map((bar, i) => {
        const x = getX(bar.timeSec);
        const y = getY(bar.estBpm);
        const isStartOfTrack =
          i === 0 || bar.trackName !== activeBars[i - 1]?.trackName;
        return `${isStartOfTrack ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    // Segmented lines between consecutive points colored by convergence
    const segments = [];
    for (let i = 0; i < activeBars.length - 1; i++) {
      const curr = activeBars[i]!;
      const next = activeBars[i + 1]!;
      if (curr.trackName !== next.trackName) continue;

      const x1 = getX(curr.timeSec);
      const y1 = getY(curr.estBpm);
      const x2 = getX(next.timeSec);
      const y2 = getY(next.estBpm);

      const deltaBpm = Math.abs(curr.estBpm - curr.refBpm);
      const tier = deltaBpm <= 0.5 ? "high" : deltaBpm <= 2.0 ? "med" : "low";

      segments.push({
        x1,
        y1,
        x2,
        y2,
        deltaBpm,
        tier,
      });
    }

    // Individual point markers
    const points = activeBars.map((bar) => {
      const x = getX(bar.timeSec);
      const yEst = getY(bar.estBpm);
      const yRef = getY(bar.refBpm);
      const deltaBpm = Math.abs(bar.estBpm - bar.refBpm);
      const tier = deltaBpm <= 0.5 ? "high" : deltaBpm <= 2.0 ? "med" : "low";
      return {
        bar,
        x,
        yEst,
        yRef,
        deltaBpm,
        tier,
      };
    });

    return {
      minBpm,
      maxBpm,
      bpmRange,
      refPath,
      estPath,
      segments,
      points,
    };
  }, [activeBars]);

  return (
    <div className={`${styles.container} ${className ?? ""}`}>
      {/* Header & Controls Section (Two Rows) */}
      <DashboardControls
        title={title}
        dataset={dataset}
        history={history}
        selectedTrackId={selectedTrackId}
        setSelectedTrackId={setSelectedTrackId}
        selectedCompareId={selectedCompareId}
        setSelectedCompareId={setSelectedCompareId}
        gradeMode={gradeMode}
        setGradeMode={setGradeMode}
      />

      <DashboardKpiCards
        gradeMode={gradeMode}
        stats={stats}
        deltas={deltas}
      />


      {/* Main Charts Layout */}
      <div className={styles.chartGrid}>
        {/* Chart A: Histogram with Non-linear Bins */}
        <HistogramChart gradeMode={gradeMode} histogramData={histogramData} />

        {/* Chart B: Cumulative Distribution Function (CDF) */}
        <CdfChart stats={stats} cdfSvgPath={cdfSvgPath} />

        {/* Chart C: Cleaned Timeline Drift Plot */}
        <DriftChart
          gradeMode={gradeMode}
          activeBars={activeBars}
          stats={stats}
          showHistoryOverlay={showHistoryOverlay}
          compareRun={compareRun}
          setHoveredPoint={setHoveredPoint}
          setTooltipPos={setTooltipPos}
        />

        {/* Chart D: Tempo Contour & Convergence Plot */}
        <ConvergenceChart
          tempoChartData={tempoChartData}
          setHoveredPoint={setHoveredPoint}
          setTooltipPos={setTooltipPos}
        />
      </div>

      {/* Floating Tooltip */}
      {hoveredPoint && tooltipPos && (
        <div
          className={styles.tooltip}
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <div className={styles.tooltipTitle}>
            {hoveredPoint.trackName} — Takt #{hoveredPoint.bar} (
            {hoveredPoint.timeSec}s)
          </div>
          <div className={styles.tooltipRow}>
            <span>Odchylenie:</span>
            <strong>{hoveredPoint.errorMs} ms</strong>
          </div>
          <div className={styles.tooltipRow}>
            <span>Zbieżność tempa:</span>
            <span
              style={{
                color:
                  Math.abs(hoveredPoint.estBpm - hoveredPoint.refBpm) <= 0.5
                    ? "#34D399"
                    : Math.abs(hoveredPoint.estBpm - hoveredPoint.refBpm) <= 2.0
                      ? "#FBBF24"
                      : "#F87171",
              }}
            >
              Δ {Math.abs(hoveredPoint.estBpm - hoveredPoint.refBpm).toFixed(2)}{" "}
              BPM
            </span>
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

