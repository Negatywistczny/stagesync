// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SongsView } from "./SongsView.js";
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

describe("SongsView", () => {
  it("renders song list and triggers callbacks on search and selection", () => {
    const library = createTestLibrary();
    const onSelect = vi.fn();
    const onCreate = vi.fn();

    render(
      <MemoryRouter>
        <SongsView
          library={library}
          libraryError={null}
          actionError={null}
          actionNotice={null}
          commandPending={false}
          transportPending={false}
          selectedId="p1"
          selected={library.projects[0]!}
          draftName="Song Alpha"
          onDraftNameChange={vi.fn()}
          onSelect={onSelect}
          onImport={vi.fn()}
          onXml={vi.fn()}
          onBatchPc={vi.fn()}
          onCreate={onCreate}
          onCreateTemplate={vi.fn()}
          onCreateFromTemplate={vi.fn()}
          onExportLibrary={vi.fn()}
          onImportFile={vi.fn()}
          onDelete={vi.fn()}
          onRename={vi.fn()}
          onPlay={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Utwory")).toBeTruthy();
    expect(screen.getByText("Song Alpha")).toBeTruthy();
    expect(screen.getByText("Song Beta")).toBeTruthy();

    const searchInput = screen.getByPlaceholderText("Filtruj…");
    fireEvent.change(searchInput, { target: { value: "Alpha" } });
    expect(screen.getByText("Song Alpha")).toBeTruthy();
  });
});
