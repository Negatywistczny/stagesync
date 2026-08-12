// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTimelineSetlistState } from "./useTimelineSetlistState.js";
import { fetchLibrary } from "@lib/shell-operator/libraryApi.js";
import { fetchSetlist } from "@lib/shell-operator/setlistApi.js";

vi.mock("@lib/shell-operator/libraryApi.js", () => ({
  fetchLibrary: vi.fn().mockResolvedValue({
    projects: [
      { id: "song-1", name: "Song One" },
      { id: "song-2", name: "Song Two" },
    ],
  }),
}));

vi.mock("@lib/shell-operator/setlistApi.js", () => ({
  fetchSetlist: vi.fn().mockResolvedValue({
    projectIds: ["song-1", "song-2", "song-3"],
    enabled: true,
    autoAdvance: { enabled: true },
  }),
}));

vi.mock("@lib/client/desktopBridge.js", () => ({
  syncNavTimelineProjectId: vi.fn(),
  syncNavRecentProjects: vi.fn(),
}));

describe("useTimelineSetlistState", () => {
  it("determines previous and next setlist IDs around current project", async () => {
    const reloadProject = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useTimelineSetlistState({
        projectId: "song-2",
        draftProjectName: "Song Two",
        songScreenOpen: true,
        setlistSnapshot: {
          projectIds: ["song-1", "song-2", "song-3"],
          enabled: true,
          autoAdvanceEnabled: true,
        },
        reloadProject,
      }),
    );

    await waitFor(() => {
      expect(result.current.libraryNames.length).toBe(2);
    });

    expect(result.current.prevSetlistId).toBe("song-1");
    expect(result.current.nextSetlistId).toBe("song-3");
    expect(result.current.setlistEnabled).toBe(true);
    expect(result.current.autoAdvance).toBe(true);
  });
});
