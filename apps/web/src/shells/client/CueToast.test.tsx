// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CueToast } from "./CueToast.js";
import type { StageCueBannerItem } from "@stagesync/shared";

describe("CueToast", () => {
  it("renders upcoming cue text and label", () => {
    const item: StageCueBannerItem = {
      slot: "upcoming",
      priority: "info",
      text: "Solo gitary za 2 takty",
      remainingTicks: 1920,
    };

    render(
      <CueToast
        item={item}
        flash={false}
        styles={{
          cueToast: "toast",
          cueToastNext: "next",
          cueToastLabel: "label",
          cueToastText: "text",
          cueToastVisible: "visible",
        }}
      />,
    );

    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByText("Solo gitary za 2 takty")).toBeTruthy();
  });
});
