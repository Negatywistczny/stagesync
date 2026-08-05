// @vitest-environment jsdom
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SmartTempoAccuracyDashboard } from "./SmartTempoAccuracyDashboard.js";

describe("SmartTempoAccuracyDashboard Component", () => {
  it("renders dashboard title and default KPI cards", () => {
    render(<SmartTempoAccuracyDashboard />);

    expect(
      screen.getByText("Smart Tempo vs Logic Pro — Wizualizacja Dokładności Siatki Taktowej"),
    ).toBeDefined();

    expect(screen.getAllByText("🟢 Dokładne (≤ 60 ms)").length).toBeGreaterThan(0);
    expect(screen.getAllByText("🟡 Tolerancja (60–125 ms)").length).toBeGreaterThan(0);
    expect(screen.getAllByText("🔴 Błąd (> 125 ms)").length).toBeGreaterThan(0);
    expect(screen.getByText("📈 Statystyki Błędu")).toBeDefined();
  });

  it("renders all 3 requested chart sections (Histogram, CDF, Timeline Drift)", () => {
    render(<SmartTempoAccuracyDashboard />);

    expect(
      screen.getAllByText("A. Histogram Błędów w Nieliniowych Przedziałach (DAW Grade)")[0],
    ).toBeDefined();
    expect(
      screen.getAllByText("B. Wykres Skumulowanej Dokładności (CDF)")[0],
    ).toBeDefined();
    expect(
      screen.getAllByText(/C\. Wykres Przebiegu Odchyleń w Czasie/)[0],
    ).toBeDefined();
  });

  it("allows switching to Stage-Ready Grade mode", () => {
    render(<SmartTempoAccuracyDashboard />);

    const stageModeBtn = screen.getAllByRole("button", {
      name: /Stage-Ready Grade/i,
    })[0]!;
    expect(stageModeBtn).toBeDefined();
    expect(stageModeBtn).toBeDefined();

    fireEvent.click(stageModeBtn);

    expect(screen.getAllByText("🟢 Stage Perfect (≤ 15 ms)").length).toBeGreaterThan(0);
    expect(screen.getAllByText("🟡 Stage Acceptable (15–35 ms)").length).toBeGreaterThan(0);
    expect(screen.getAllByText("🔴 Stage Unusable (> 35 ms)").length).toBeGreaterThan(0);
  });

  it("allows switching between track filters", () => {
    render(<SmartTempoAccuracyDashboard />);

    const billieBtn = screen.getAllByRole("button", { name: /Billie Jean/i })[0]!;
    expect(billieBtn).toBeDefined();

    fireEvent.click(billieBtn);
    expect(billieBtn.className).toContain("trackBtnActive");
  });

  it("renders comparison baseline selector and delta badges", () => {
    const mockHistory = [
      {
        id: "run-baseline-old",
        timestamp: "2026-08-04T12:00:00Z",
        gitCommit: "old123",
        note: "Initial Old Run",
        summary: {
          totalMeasures: 349,
          exactPct: 31.5,
          closePct: 61.0,
          failPct: 7.5,
          meanMs: 84.2,
          medianMs: 68.5,
          p95Ms: 156.0,
          dawGrade: { exactPct: 31.5, closePct: 61.0, failPct: 7.5 },
          stageGrade: { perfectPct: 15.0, acceptablePct: 25.0, unusablePct: 60.0 },
        },
      },
    ];

    render(<SmartTempoAccuracyDashboard history={mockHistory} />);

    const select = screen.getAllByRole("combobox", {
      name: "Wersja odniesienia (Baseline)",
    })[0] as HTMLSelectElement;
    expect(select).toBeDefined();

    expect(screen.getAllByText(/-\d+\.\d+% 🔴|\+\d+\.\d+% 🟢/)[0]).toBeDefined();
  });

  it("renders custom dataset when provided as props", () => {
    const mockCustomDataset = [
      {
        id: "mock-track",
        name: "Mock Track",
        artist: "Test Artist",
        durationSec: 120,
        barsCount: 10,
        exactPct: 80,
        closePct: 20,
        failPct: 0,
        avgErrorMs: 25.5,
        medianErrorMs: 20,
        p95ErrorMs: 55,
        bars: Array.from({ length: 10 }, (_, i) => ({
          trackName: "Mock Track",
          bar: i + 1,
          timeSec: i * 2,
          refBpm: 120,
          estBpm: 120,
          refBarMs: 2000,
          estBarMs: 2000,
          errorMs: i * 5,
          tier: (i * 5 <= 60 ? "exact" : i * 5 <= 125 ? "close" : "fail") as "exact" | "close" | "fail",
          stageTier: (i * 5 <= 15 ? "stage-perfect" : i * 5 <= 35 ? "stage-acceptable" : "stage-unusable") as "stage-perfect" | "stage-acceptable" | "stage-unusable",
        })),
      },
    ];

    render(<SmartTempoAccuracyDashboard dataset={mockCustomDataset} />);

    expect(screen.getByText("Mock Track")).toBeDefined();
    expect(screen.getAllByText("100%").length).toBeGreaterThan(0);
  });

  it("does not draw connecting line between different tracks in Chart C", () => {
    const multiTrackDataset = [
      {
        id: "track-1",
        name: "Track 1",
        artist: "Artist 1",
        durationSec: 60,
        barsCount: 2,
        exactPct: 100,
        closePct: 0,
        failPct: 0,
        avgErrorMs: 10,
        medianErrorMs: 10,
        p95ErrorMs: 10,
        bars: [
          { trackName: "Track 1", bar: 1, timeSec: 0, refBpm: 120, estBpm: 120, refBarMs: 2000, estBarMs: 2000, errorMs: 10, tier: "exact" as const },
          { trackName: "Track 1", bar: 2, timeSec: 2, refBpm: 120, estBpm: 120, refBarMs: 2000, estBarMs: 2000, errorMs: 12, tier: "exact" as const },
        ],
      },
      {
        id: "track-2",
        name: "Track 2",
        artist: "Artist 2",
        durationSec: 60,
        barsCount: 2,
        exactPct: 100,
        closePct: 0,
        failPct: 0,
        avgErrorMs: 15,
        medianErrorMs: 15,
        p95ErrorMs: 15,
        bars: [
          { trackName: "Track 2", bar: 1, timeSec: 0, refBpm: 120, estBpm: 120, refBarMs: 2000, estBarMs: 2000, errorMs: 15, tier: "exact" as const },
          { trackName: "Track 2", bar: 2, timeSec: 2, refBpm: 120, estBpm: 120, refBarMs: 2000, estBarMs: 2000, errorMs: 18, tier: "exact" as const },
        ],
      },
    ];

    const { container } = render(<SmartTempoAccuracyDashboard dataset={multiTrackDataset} />);
    const driftPath = container.querySelector("path[class*='driftLine']");
    expect(driftPath).not.toBeNull();
    const pathD = driftPath?.getAttribute("d") || "";
    // There should be 2 'M' commands in pathD: one for Track 1 bar 1, and one for Track 2 bar 1
    const mCount = (pathD.match(/M/g) || []).length;
    expect(mCount).toBe(2);
  });
});
