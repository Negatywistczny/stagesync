/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen, waitFor, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { putSetlist } from "@lib/shell-operator/setlistApi.js";

vi.mock("@lib/shell-operator/setlistApi.js", () => ({
  fetchSetlist: vi.fn(async () => ({
    items: [],
    enabled: false,
    autoAdvance: { enabled: false },
    timeBudgetMinutes: 90,
  })),
  patchSetlistAutoAdvance: vi.fn(async () => undefined),
  putSetlist: vi.fn(async () => undefined),
}));

import { SetView } from "./SetView.js";

afterEach(() => {
  cleanup();
});

describe("SetView", () => {
  it("names set toolbar and library/set panels", async () => {
    render(<SetView library={null} selectedId={null} />);
    await waitFor(() => {
      expect(
        screen.getByRole("toolbar", { name: "Akcje setlisty" }),
      ).toBeTruthy();
    });
    expect(
      screen.getByRole("button", { name: "Wyczyść setlistę" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Zapisz setlistę" }),
    ).toBeTruthy();
    expect(screen.getByRole("region", { name: "Set" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Biblioteka" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Kolejność setu" })).toBeTruthy();
  });

  it("allows adding songs and saving setlist", async () => {
    const dummyLibrary = {
      projects: [
        {
          id: "song-1",
          name: "Pierwszy utwór",
          artist: "Zespół A",
          updatedAt: new Date().toISOString(),
          approxDurationSeconds: 180,
          formaSectionCount: 4,
          audioTrackCount: 2,
        },
        {
          id: "song-2",
          name: "Drugi utwór",
          artist: "Zespół B",
          updatedAt: new Date().toISOString(),
          approxDurationSeconds: 240,
          formaSectionCount: 5,
          audioTrackCount: 1,
        },
      ],
    };

    render(<SetView library={dummyLibrary as any} selectedId="song-1" />);

    await waitFor(() => {
      expect(screen.getByText("Pierwszy utwór")).toBeTruthy();
    });

    const addPickedBtn = screen.getByRole("button", {
      name: /Dodaj zaznaczone/i,
    });
    fireEvent.click(addPickedBtn);

    const saveBtn = screen.getByRole("button", { name: "Zapisz setlistę" });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(putSetlist).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [expect.objectContaining({ projectId: "song-1" })],
        }),
      );
    });
  });
});
