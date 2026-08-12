// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BatchPcModal } from "./BatchPcModal.js";
import type { Library } from "@stagesync/shared";

function createTestLibrary(): Library {
  return {
    version: 1,
    projects: [
      {
        id: "p1",
        name: "Song Alpha",
        midiProgramId: 1,
        updatedAt: new Date().toISOString(),
      },
      {
        id: "p2",
        name: "Song Beta",
        midiProgramId: 2,
        updatedAt: new Date().toISOString(),
      },
    ],
  };
}

describe("BatchPcModal", () => {
  it("renders PC assignments and supports renumbering", () => {
    const library = createTestLibrary();
    const onClose = vi.fn();
    const onSaved = vi.fn();

    render(
      <BatchPcModal library={library} onClose={onClose} onSaved={onSaved} />,
    );

    expect(screen.getByText("Numeracja Program Change")).toBeTruthy();
    expect(screen.getByText("Song Alpha")).toBeTruthy();
    expect(screen.getByText("Song Beta")).toBeTruthy();

    const renumberBtn = screen.getByText("Numeruj od startu");
    fireEvent.click(renumberBtn);

    const cancelBtn = screen.getByText("Anuluj");
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
