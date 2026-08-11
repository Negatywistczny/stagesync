import type {
  BarDataPoint,
  DawTier,
  StageTier,
} from "../SmartTempoAccuracyDashboard.js";

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
