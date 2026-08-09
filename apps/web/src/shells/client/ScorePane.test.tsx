/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { createProjectSeed } from "@stagesync/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScorePane } from "./ScorePane.js";

afterEach(() => {
  cleanup();
});

const common = {
  displayTicks: 0,
  scoreZoom: 1,
  followPlayhead: true,
  scoreOctave: 0 as const,
  hiddenPartIds: [] as const,
  onPartsChange: vi.fn(),
  onSeek: vi.fn(),
};

describe("ScorePane empty states", () => {
  it("announces waiting when no active project id", () => {
    render(
      <ScorePane
        {...common}
        project={null}
        loading={false}
        hasActiveProjectId={false}
      />,
    );
    expect(screen.getByRole("status").textContent).toMatch(
      /Oczekiwanie na utwór/,
    );
  });

  it("announces loading while project is null", () => {
    render(<ScorePane {...common} project={null} loading hasActiveProjectId />);
    expect(screen.getByRole("status").textContent).toMatch(
      /Wczytywanie utworu/,
    );
  });

  it("announces load failure when project missing after load", () => {
    render(
      <ScorePane
        {...common}
        project={null}
        loading={false}
        hasActiveProjectId
      />,
    );
    expect(screen.getByRole("status").textContent).toMatch(
      /Nie udało się wczytać utworu/,
    );
  });

  it("announces missing MusicXML asset", () => {
    const project = createProjectSeed(
      "song-1",
      "Test Song",
      "2026-07-26T00:00:00.000Z",
    );
    project.assets = [];
    render(
      <ScorePane
        {...common}
        project={project}
        loading={false}
        hasActiveProjectId
      />,
    );
    expect(screen.getByRole("status").textContent).toMatch(
      /Brak pliku MusicXML/,
    );
  });
});
