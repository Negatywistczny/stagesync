// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAdminLibraryActions } from "./useAdminLibraryActions.js";

vi.mock("@lib/shell-operator/libraryApi.js", () => ({
  fetchLibrary: vi.fn().mockResolvedValue({
    projects: [
      { id: "p1", name: "Song A", updatedAt: new Date().toISOString() },
      { id: "p2", name: "Song B", updatedAt: new Date().toISOString() },
    ],
  }),
  createProject: vi.fn().mockResolvedValue({ id: "p3", name: "Song C" }),
  deleteProject: vi.fn().mockResolvedValue({ ok: true }),
  updateProject: vi.fn().mockResolvedValue({ ok: true }),
  exportLibraryPack: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
  importLibraryPack: vi.fn().mockResolvedValue({ ok: true }),
}));

describe("useAdminLibraryActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches library and sets selected project", async () => {
    const { result } = renderHook(() => useAdminLibraryActions());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.library).not.toBeNull();
    expect(result.current.selectedId).toBe("p1");
    expect(result.current.selected?.name).toBe("Song A");
  });

  it("opens create prompt and confirms project creation", async () => {
    const { result } = renderHook(() => useAdminLibraryActions());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    act(() => {
      result.current.onCreate();
    });

    expect(result.current.createPromptOpen).toBe(true);

    await act(async () => {
      result.current.confirmCreate("New Song");
    });

    expect(result.current.createPromptOpen).toBe(false);
  });
});
