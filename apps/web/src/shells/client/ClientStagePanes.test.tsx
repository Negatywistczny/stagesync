// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClientStagePanes } from "./ClientStagePanes.js";
import type { Project } from "@stagesync/shared";
import type { ClientDisplayPrefs } from "@lib/client/clientDisplayPrefs.js";

describe("ClientStagePanes", () => {
  const dummyProject: Project = {
    id: "p1",
    name: "Song",
    formatVersion: 6,
    updatedAt: new Date().toISOString(),
    ppq: 960,
    defaultBpm: 120,
    defaultMeter: { numerator: 4, denominator: 4 },
    forma: {
      clips: [
        {
          id: "f-1",
          name: "Zwrotka",
          kind: "section",
          startTicks: 0,
          lengthTicks: 3840,
        },
      ],
    },
    tempoMap: [],
    meterMap: [],
    keyMap: [],
    akordy: {
      clips: [{ id: "a-1", symbol: "C", startTicks: 0, lengthTicks: 3840 }],
    },
    tekst: {
      clips: [
        {
          id: "t-1",
          text: "Tekst",
          startTicks: 0,
          lengthTicks: 3840,
          blocks: [
            { id: "b1", text: "Tekst", startTicks: 0, lengthTicks: 3840 },
          ],
        },
      ],
    },
    melody: { clips: [] },
    cue: { clips: [] },
    scoreBarMap: { anchors: [] },
    audioTracks: [],
    audioClips: [],
    assets: [],
  };

  const dummyPrefs: ClientDisplayPrefs = {
    hybridPolishB: false,
    literalQuality: false,
    gridAnimations: false,
    formNotesEdit: false,
    sectionNamesPolish: false,
    instrumentPitch: "concert",
    instrumentPitchManual: 0,
  };

  it("renders selected roles (e.g. drums / grid) and pane sections", () => {
    Element.prototype.scrollTo = vi.fn();
    render(
      <ClientStagePanes
        picked={["drums", "grid"]}
        activeProject={dummyProject}
        displayTicks={0}
        projectLoading={false}
        activeProjectId="p1"
        displayPrefs={dummyPrefs}
        setDisplayPrefs={vi.fn()}
        liveDesk={{ transpositionSemitones: 0, customChords: {} } as any}
        vocalTapOn={false}
        setVocalTapOn={vi.fn()}
        vocalTapIndex={0}
        setVocalTapIndex={vi.fn()}
        setActiveProject={vi.fn()}
        setDrumsNoteError={vi.fn()}
        roleSettings={null}
        setRoleSettings={vi.fn()}
        toggleRoleSettings={vi.fn()}
        scoreZoom={1}
        setScoreZoom={vi.fn()}
        scoreFollowPlayhead={true}
        setScoreFollowPlayhead={vi.fn()}
        scoreOctave={"0" as any}
        setScoreOctave={vi.fn()}
        scoreParts={[]}
        setScoreParts={vi.fn()}
        scoreHiddenPartIds={[]}
        setScoreHiddenPartIds={vi.fn()}
        seek={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByRole("region", { name: "Forma" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Akordy" })).toBeTruthy();
  });
});
