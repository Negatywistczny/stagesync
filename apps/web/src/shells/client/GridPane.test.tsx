/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ClientDisplayPrefs } from "@lib/client/clientDisplayPrefs.js";
import { GridPane } from "./GridPane.js";

const prefs: ClientDisplayPrefs = {
  hybridPolishB: false,
  literalQuality: false,
  gridAnimations: false,
  formNotesEdit: false,
  sectionNamesPolish: false,
  instrumentPitch: "concert",
  instrumentPitchManual: 0,
};

afterEach(() => {
  cleanup();
});

describe("GridPane empty states", () => {
  it("announces waiting when no active project id", () => {
    render(
      <GridPane
        project={null}
        displayTicks={0}
        loading={false}
        hasActiveProjectId={false}
        prefs={prefs}
      />,
    );
    expect(screen.getByRole("status").textContent).toMatch(/Oczekiwanie na utwór/);
  });

  it("announces loading while project is null", () => {
    render(
      <GridPane
        project={null}
        displayTicks={0}
        loading
        hasActiveProjectId
        prefs={prefs}
      />,
    );
    expect(screen.getByRole("status").textContent).toMatch(/Wczytywanie utworu/);
  });

  it("announces load failure when project missing after load", () => {
    render(
      <GridPane
        project={null}
        displayTicks={0}
        loading={false}
        hasActiveProjectId
        prefs={prefs}
      />,
    );
    expect(screen.getByRole("status").textContent).toMatch(
      /Nie udało się wczytać utworu/,
    );
  });
});
