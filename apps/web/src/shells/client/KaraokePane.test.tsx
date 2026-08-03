/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  createProjectV6Seed,
  DEFAULT_PPQ,
  withWholeLineTekstBlocks,
  type Project,
  type TekstClip,
} from "@stagesync/shared";
import type { ClientDisplayPrefs } from "../../lib/clientDisplayPrefs.js";
import { KaraokePane } from "./KaraokePane.js";

const prefs: ClientDisplayPrefs = {
  hybridPolishB: false,
  literalQuality: false,
  gridAnimations: false,
  formNotesEdit: false,
  sectionNamesPolish: false,
  instrumentPitch: "concert",
  instrumentPitchManual: 0,
};

const BEAT = DEFAULT_PPQ;

function lineClip(
  partial: Omit<TekstClip, "blocks"> & { blocks?: TekstClip["blocks"] },
): TekstClip {
  if (partial.blocks != null && partial.blocks.length > 0) {
    return partial as TekstClip;
  }
  return withWholeLineTekstBlocks(partial);
}

function baseProject(tekstClips: TekstClip[]): Project {
  return {
    ...createProjectV6Seed("p", "Song", "2026-07-20T00:00:00.000Z"),
    tekst: { clips: tekstClips },
  };
}

afterEach(() => {
  cleanup();
  try {
    localStorage.removeItem("stagesync-karaoke-role-filter");
  } catch {
    /* ignore */
  }
});

describe("KaraokePane empty states", () => {
  it("announces waiting when no active project id", () => {
    render(
      <KaraokePane
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
      <KaraokePane
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
      <KaraokePane
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

describe("KaraokePane block highlight", () => {
  it("renders timed block spans with active/past state", () => {
    const project = baseProject([
      lineClip({
        id: "tx-1",
        text: "Hello world",
        startTicks: 0,
        lengthTicks: 4 * BEAT,
        blocks: [
          {
            id: "b-hello",
            text: "Hello ",
            startTicks: 0,
            lengthTicks: BEAT,
          },
          {
            id: "b-world",
            text: "world",
            startTicks: 2 * BEAT,
            lengthTicks: BEAT,
          },
        ],
      }),
    ]);

    const { rerender } = render(
      <KaraokePane
        project={project}
        displayTicks={BEAT / 2}
        loading={false}
        hasActiveProjectId
        prefs={prefs}
      />,
    );

    const hello = document.querySelector('[data-block-id="b-hello"]');
    const world = document.querySelector('[data-block-id="b-world"]');
    expect(hello?.getAttribute("data-block-active")).toBe("true");
    expect(world?.getAttribute("data-block-active")).toBeNull();
    expect(world?.getAttribute("data-block-past")).toBeNull();

    rerender(
      <KaraokePane
        project={project}
        displayTicks={2 * BEAT + 10}
        loading={false}
        hasActiveProjectId
        prefs={prefs}
      />,
    );

    const hello2 = document.querySelector('[data-block-id="b-hello"]');
    const world2 = document.querySelector('[data-block-id="b-world"]');
    expect(hello2?.getAttribute("data-block-past")).toBe("true");
    expect(world2?.getAttribute("data-block-active")).toBe("true");
  });

  it("keeps spaces between words when blocks were trimmed (US import)", () => {
    const project = baseProject([
      lineClip({
        id: "tx-drums",
        text: "I hear the drums",
        startTicks: 0,
        lengthTicks: 4 * BEAT,
        blocks: [
          { id: "b-i", text: "I", startTicks: 0, lengthTicks: BEAT },
          { id: "b-hear", text: "hear", startTicks: BEAT, lengthTicks: BEAT },
          { id: "b-the", text: "the", startTicks: 2 * BEAT, lengthTicks: BEAT },
          {
            id: "b-drums",
            text: "drums",
            startTicks: 3 * BEAT,
            lengthTicks: BEAT,
          },
        ],
      }),
    ]);

    render(
      <KaraokePane
        project={project}
        displayTicks={0}
        loading={false}
        hasActiveProjectId
        prefs={prefs}
      />,
    );

    const line = document.querySelector('[data-line-id="tx-drums"]');
    expect(line?.textContent).toBe("I hear the drums");
    expect(line?.textContent).not.toBe("Ihearthedrums");
  });

  it("single migrated block looks like whole-line highlight", () => {
    const project = baseProject([
      lineClip({
        id: "tx-one",
        text: "Whole line",
        startTicks: 0,
        lengthTicks: 2 * BEAT,
      }),
    ]);

    render(
      <KaraokePane
        project={project}
        displayTicks={BEAT}
        loading={false}
        hasActiveProjectId
        prefs={prefs}
      />,
    );

    const block = document.querySelector('[data-block-id="tx-one-block-0"]');
    expect(block?.textContent).toBe("Whole line");
    expect(block?.getAttribute("data-block-active")).toBe("true");
    expect(screen.getByText("Whole line")).toBeTruthy();
  });

  it("shows role filter when ≥2 roles and filters blocks", () => {
    const project = baseProject([
      lineClip({
        id: "tx-duet",
        text: "You me",
        startTicks: 0,
        lengthTicks: 4 * BEAT,
        blocks: [
          {
            id: "b-v1",
            text: "You ",
            startTicks: 0,
            lengthTicks: 2 * BEAT,
            role: "vocal_1",
          },
          {
            id: "b-v2",
            text: "me",
            startTicks: 2 * BEAT,
            lengthTicks: 2 * BEAT,
            role: "vocal_2",
          },
        ],
      }),
    ]);

    render(
      <KaraokePane
        project={project}
        displayTicks={BEAT}
        loading={false}
        hasActiveProjectId
        prefs={prefs}
      />,
    );

    const filter = screen.getByTestId("karaoke-role-filter");
    expect(filter).toBeTruthy();
    expect(document.querySelector('[data-block-id="b-v1"]')).toBeTruthy();
    expect(document.querySelector('[data-block-id="b-v2"]')).toBeTruthy();

    fireEvent.change(filter, { target: { value: "vocal_1" } });
    expect(document.querySelector('[data-block-id="b-v1"]')).toBeTruthy();
    expect(document.querySelector('[data-block-id="b-v2"]')).toBeNull();
  });

  it("hides role filter when fewer than 2 roles", () => {
    const project = baseProject([
      lineClip({
        id: "tx-solo",
        text: "Solo",
        startTicks: 0,
        lengthTicks: BEAT,
        blocks: [
          {
            id: "b-solo",
            text: "Solo",
            startTicks: 0,
            lengthTicks: BEAT,
            role: "vocal_1",
          },
        ],
      }),
    ]);

    render(
      <KaraokePane
        project={project}
        displayTicks={0}
        loading={false}
        hasActiveProjectId
        prefs={prefs}
      />,
    );

    expect(screen.queryByTestId("karaoke-role-filter")).toBeNull();
  });
});
