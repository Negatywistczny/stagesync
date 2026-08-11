import styles from "../SmartTempoAccuracyDashboard.module.css";
import type {
  BenchmarkHistoryEntry,
  TrackBenchmarkDataset,
} from "./dashboardTypes.js";

export function DashboardControls({
  title,
  dataset,
  history,
  selectedTrackId,
  setSelectedTrackId,
  selectedCompareId,
  setSelectedCompareId,
  gradeMode,
  setGradeMode,
}: {
  title: string;
  dataset: TrackBenchmarkDataset[];
  history: BenchmarkHistoryEntry[];
  selectedTrackId: string;
  setSelectedTrackId: (id: string) => void;
  selectedCompareId: string;
  setSelectedCompareId: (id: string) => void;
  gradeMode: "daw" | "stage";
  setGradeMode: (m: "daw" | "stage") => void;
}) {
  return (
      <div className={styles.header}>
        {/* Row 1: Title, Subtitle, Grade Mode Switcher, Baseline Selector */}
        <div className={styles.headerRow1}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>
              {title}
              <span className={styles.badgeHeader}>Logic Pro SSOT</span>
            </h2>
            <p className={styles.subtitle}>
              Porównanie odchyleń siatki Smart Tempo z Logic Pro. Ocena
              dwupoziomowa: Studio DAW vs Estradowa Live.
            </p>
          </div>

          <div className={styles.headerControlsRight}>
            {/* Dual-Tier Metric Grade Mode Switch */}
            <div
              className={styles.gradeModeToggle}
              role="tablist"
              aria-label="Tryb oceny metryk"
            >
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
                    {h.note.length > 30 ? `${h.note.slice(0, 30)}…` : h.note} (
                    {h.gitCommit} · Exact {h.summary.exactPct}%)
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Row 2: Track Selector Pills Bar */}
        <div className={styles.headerRow2}>
          <div
            className={styles.trackSelector}
            role="tablist"
            aria-label="Wybór utworu"
          >
            <button
              type="button"
              className={`${styles.trackBtn} ${selectedTrackId === "all" ? styles.trackBtnActive : ""}`}
              onClick={() => setSelectedTrackId("all")}
            >
              Wszystkie ({dataset.reduce((sum, t) => sum + t.barsCount, 0)}{" "}
              miar)
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
  );
}
