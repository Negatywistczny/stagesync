/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { createProjectSeed, type Project } from "@stagesync/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DrumsPane } from "./DrumsPane.js";

beforeEach(() => {
  Element.prototype.scrollTo = vi.fn() as typeof Element.prototype.scrollTo;
});

afterEach(() => {
  cleanup();
});

describe("DrumsPane empty and aria", () => {
  it("announces waiting when forma context is unavailable", () => {
    render(
      <DrumsPane
        project={null as unknown as Project}
        displayTicks={0}
      />,
    );
    expect(screen.getByRole("status").textContent).toMatch(
      /Oczekiwanie na utwór/,
    );
  });

  it("exposes Forma strip and metronom aria labels", () => {
    const project = createProjectSeed(
      "song-1",
      "Test Song",
      "2026-07-26T00:00:00.000Z",
    );
    render(<DrumsPane project={project} displayTicks={100} />);
    expect(screen.getByLabelText("Forma utworu")).toBeTruthy();
    expect(
      screen.getByLabelText(/Metronom — beat \d+ \/ \d+/),
    ).toBeTruthy();
  });

  it("renders editable note field when notesEdit is on", () => {
    const project = createProjectSeed(
      "song-1",
      "Test Song",
      "2026-07-26T00:00:00.000Z",
    );
    const intro = project.forma.clips.find(
      (c) => c.kind === "section" && c.name === "Intro",
    );
    if (intro && intro.kind === "section") {
      intro.note = "watch kick";
    }
    const onNoteChange = vi.fn();
    render(
      <DrumsPane
        project={project}
        displayTicks={100}
        notesEdit
        onNoteChange={onNoteChange}
      />,
    );
    expect(
      screen.getByLabelText("Notatka aktywnej sekcji"),
    ).toBeTruthy();
  });
});
