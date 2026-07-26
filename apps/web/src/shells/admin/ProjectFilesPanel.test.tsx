/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { createProjectSeed } from "@stagesync/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectFilesPanel } from "./ProjectFilesPanel.js";

vi.mock("../../lib/libraryApi.js", () => ({
  fetchProject: vi.fn(),
}));

vi.mock("../../lib/projectAssetsApi.js", () => ({
  deleteProjectAsset: vi.fn(),
  uploadProjectAudio: vi.fn(),
}));

import { fetchProject } from "../../lib/libraryApi.js";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ProjectFilesPanel empty, list, and delete aria", () => {
  it("announces choose-song when projectId is null", () => {
    render(<ProjectFilesPanel projectId={null} />);
    expect(screen.getByRole("status").textContent).toMatch(/Wybierz utwór/);
  });

  it("announces empty project files after load", async () => {
    const project = createProjectSeed(
      "song-1",
      "Test Song",
      "2026-07-26T00:00:00.000Z",
    );
    project.assets = [];
    vi.mocked(fetchProject).mockResolvedValue(project);

    render(<ProjectFilesPanel projectId="song-1" />);
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toMatch(
        /Brak plików w projekcie/,
      );
    });
  });

  it("exposes file list region when assets exist", async () => {
    const project = createProjectSeed(
      "song-1",
      "Test Song",
      "2026-07-26T00:00:00.000Z",
    );
    project.assets = [
      {
        id: "a1",
        kind: "audio",
        originalName: "kick.wav",
        storageName: "kick.wav",
        mimeType: "audio/wav",
        sizeBytes: 2048,
      },
    ];
    vi.mocked(fetchProject).mockResolvedValue(project);

    render(<ProjectFilesPanel projectId="song-1" />);
    await waitFor(() => {
      expect(screen.getByLabelText("Pliki projektu")).toBeTruthy();
    });
    expect(screen.getByText("kick.wav")).toBeTruthy();
  });

  it("surfaces load errors as alerts", async () => {
    vi.mocked(fetchProject).mockRejectedValue(new Error("Sieć niedostępna"));
    render(<ProjectFilesPanel projectId="song-1" />);
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/Sieć niedostępna/);
    });
  });

  it("names Usuń by original filename", async () => {
    const project = createProjectSeed(
      "song-1",
      "Test Song",
      "2026-07-26T00:00:00.000Z",
    );
    project.assets = [
      {
        id: "a1",
        kind: "audio",
        originalName: "kick.wav",
        storageName: "kick.wav",
        mimeType: "audio/wav",
        sizeBytes: 2048,
      },
    ];
    vi.mocked(fetchProject).mockResolvedValue(project);

    render(<ProjectFilesPanel projectId="song-1" />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Usuń kick.wav" }),
      ).toBeTruthy();
    });
  });
});
