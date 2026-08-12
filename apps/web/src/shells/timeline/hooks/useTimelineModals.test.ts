// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelineModals } from "./useTimelineModals.js";

describe("useTimelineModals", () => {
  it("initializes with default closed state and opens/closes song import wizard", () => {
    const { result } = renderHook(() => useTimelineModals());

    expect(result.current.helpOpen).toBe(false);
    expect(result.current.songScreenOpen).toBe(false);
    expect(result.current.songImportOpen).toBe(false);

    act(() => {
      result.current.openSongImportWizard(true);
    });

    expect(result.current.songImportOpen).toBe(true);
    expect(result.current.importAsNewSong).toBe(true);

    act(() => {
      result.current.closeSongImportWizard();
    });

    expect(result.current.songImportOpen).toBe(false);
    expect(result.current.importAsNewSong).toBe(false);
  });
});
