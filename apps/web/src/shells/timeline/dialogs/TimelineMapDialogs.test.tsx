// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimelineMapDialogs, type TimelineMapDialogsProps } from "./TimelineMapDialogs.js";
import type { Project } from "@stagesync/shared";

function createDefaultProps(overrides?: Partial<TimelineMapDialogsProps>): TimelineMapDialogsProps {
  const dummyProject: Project = {
    id: "p1",
    name: "Map Test Song",
    formatVersion: 6 as const,
    updatedAt: new Date().toISOString(),
    ppq: 960,
    defaultBpm: 120,
    defaultMeter: { numerator: 4, denominator: 4 },
    forma: { clips: [] },
    tempoMap: [],
    meterMap: [],
    keyMap: [],
    akordy: { clips: [] },
    cue: { clips: [] },
    tekst: { clips: [] },
    melody: { clips: [] },
    scoreBarMap: { anchors: [] },
    audioTracks: [],
    audioClips: [],
    assets: [],
  };

  return {
    draftProject: dummyProject,
    displayTicks: 0,
    mapEditTicks: 0,
    commitDraft: vi.fn(),
    tempoEditOpen: false,
    setTempoEditOpen: vi.fn(),
    tempoEditTitleId: "tempo-dialog-title",
    tempoDraft: "128",
    setTempoDraft: vi.fn(),
    meterEditOpen: false,
    setMeterEditOpen: vi.fn(),
    meterEditTitleId: "meter-dialog-title",
    meterNumDraft: "3",
    setMeterDenDraft: vi.fn(),
    meterDenDraft: "4",
    setMeterNumDraft: vi.fn(),
    keyEditOpen: false,
    setKeyEditOpen: vi.fn(),
    keyEditTitleId: "key-dialog-title",
    touchAlertOpen: false,
    setTouchAlertOpen: vi.fn(),
    ...overrides,
  };
}

describe("TimelineMapDialogs", () => {
  it("renders tempo dialog, handles bpm input and save", () => {
    const commitDraft = vi.fn();
    const setTempoEditOpen = vi.fn();
    const setTempoDraft = vi.fn();

    const props = createDefaultProps({
      tempoEditOpen: true,
      tempoDraft: "135",
      commitDraft,
      setTempoEditOpen,
      setTempoDraft,
    });

    render(<TimelineMapDialogs {...props} />);

    expect(screen.getByText(/Tempo @/i)).toBeTruthy();
    const bpmInput = screen.getByRole("spinbutton");
    expect((bpmInput as HTMLInputElement).value).toBe("135");

    fireEvent.change(bpmInput, { target: { value: "140" } });
    expect(setTempoDraft).toHaveBeenCalledWith("140");

    const saveBtn = screen.getByText("Zapisz");
    fireEvent.click(saveBtn);
    expect(commitDraft).toHaveBeenCalled();
    expect(setTempoEditOpen).toHaveBeenCalledWith(false);
  });

  it("renders meter dialog and handles numerator/denominator edit", () => {
    const commitDraft = vi.fn();
    const setMeterEditOpen = vi.fn();
    const setMeterNumDraft = vi.fn();

    const props = createDefaultProps({
      meterEditOpen: true,
      meterNumDraft: "6",
      meterDenDraft: "8",
      commitDraft,
      setMeterEditOpen,
      setMeterNumDraft,
    });

    render(<TimelineMapDialogs {...props} />);

    expect(screen.getByText(/Metrum @/i)).toBeTruthy();
    const numInput = screen.getByLabelText("Metrum — górna liczba");
    const denSelect = screen.getByLabelText("Metrum — dolna liczba");
    expect((numInput as HTMLInputElement).value).toBe("6");
    expect((denSelect as HTMLSelectElement).value).toBe("8");

    fireEvent.change(numInput, { target: { value: "7" } });
    expect(setMeterNumDraft).toHaveBeenCalledWith("7");

    const saveBtn = screen.getByText("Zapisz");
    fireEvent.click(saveBtn);
    expect(commitDraft).toHaveBeenCalled();
    expect(setMeterEditOpen).toHaveBeenCalledWith(false);
  });

  it("renders touch alert dialog and allows closing", () => {
    const setTouchAlertOpen = vi.fn();
    const props = createDefaultProps({
      touchAlertOpen: true,
      setTouchAlertOpen,
    });

    render(<TimelineMapDialogs {...props} />);

    expect(
      screen.getByText("Użyj tabletu lub komputera do pełnej edycji"),
    ).toBeTruthy();
    const okBtn = screen.getByRole("button", { name: "Rozumiem" });
    fireEvent.click(okBtn);
    expect(setTouchAlertOpen).toHaveBeenCalledWith(false);
  });
});
