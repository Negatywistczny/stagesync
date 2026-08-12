// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CombinedImportFooter, type CombinedImportFooterProps } from "./CombinedImportFooter.js";

function createDefaultProps(overrides?: Partial<CombinedImportFooterProps>): CombinedImportFooterProps {
  return {
    step: "us",
    locked: false,
    onCancel: vi.fn(),
    go: vi.fn(),
    stepBeforeAudio: () => "ug",
    stepBeforeBeatmap: () => "audio",
    stepAfterUg: () => "audio",
    canGoNextUs: true,
    canGoNextUg: true,
    canGoNextAudio: true,
    canApply: true,
    usTitle: "Song A",
    usArtist: "Artist B",
    usPreview: { ok: true, title: "Song A", artist: "Artist B" },
    setUgTitle: vi.fn(),
    setUgArtist: vi.fn(),
    setConfirmWeak: vi.fn(),
    hasAudio: true,
    busyApply: false,
    applying: false,
    applyLabel: "Utwórz utwór",
    apply: vi.fn(),
    ...overrides,
  };
}

describe("CombinedImportFooter", () => {
  it("renders on US step, handles Cancel and Next", () => {
    const onCancel = vi.fn();
    const go = vi.fn();
    const setUgTitle = vi.fn();
    const setUgArtist = vi.fn();

    const props = createDefaultProps({
      step: "us",
      onCancel,
      go,
      setUgTitle,
      setUgArtist,
    });

    render(<CombinedImportFooter {...props} />);

    const cancelBtn = screen.getByRole("button", { name: "Anuluj" });
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalled();

    const nextBtn = screen.getByRole("button", { name: "Dalej" });
    fireEvent.click(nextBtn);
    expect(go).toHaveBeenCalledWith("ug");
    expect(setUgTitle).toHaveBeenCalled();
    expect(setUgArtist).toHaveBeenCalled();
  });

  it("renders on Beatmap step and allows triggering apply", () => {
    const apply = vi.fn();
    const props = createDefaultProps({
      step: "beatmap",
      apply,
    });

    render(<CombinedImportFooter {...props} />);

    const applyBtn = screen.getByRole("button", { name: "Utwórz utwór" });
    fireEvent.click(applyBtn);
    expect(apply).toHaveBeenCalled();
  });
});
