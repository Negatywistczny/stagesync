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
  stageGrade?: {
    perfectPct: number;
    acceptablePct: number;
    unusablePct: number;
  };
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
    stageGrade?: {
      perfectPct: number;
      acceptablePct: number;
      unusablePct: number;
    };
  };
  perSong?: Record<
    string,
    {
      exactPct: number;
      meanMs: number;
      stageGrade?: {
        perfectPct: number;
        acceptablePct: number;
        unusablePct: number;
      };
    }
  >;
};

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
