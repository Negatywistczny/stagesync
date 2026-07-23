import { describe, expect, it } from "vitest";
import {
  isReservedToolLetter,
  resolveTimelineShortcut,
  TIMELINE_TOOL_LETTER_IDS,
  type TimelineShortcutInput,
} from "./timelineKeyboardShortcuts.js";

function base(
  overrides: Partial<TimelineShortcutInput> & Pick<TimelineShortcutInput, "key">,
): TimelineShortcutInput {
  return {
    code: overrides.code ?? overrides.key,
    mod: false,
    alt: false,
    shift: false,
    toolMenuOpen: false,
    wandMenuOpen: false,
    helpOpen: false,
    tapToolActive: false,
    ...overrides,
  };
}

describe("isReservedToolLetter", () => {
  it("marks global letters (tools are T-chord only)", () => {
    for (const k of ["w", "x", "i", "c", "k", "u", "z", "t", "l"]) {
      expect(isReservedToolLetter(k)).toBe(true);
    }
    expect(isReservedToolLetter("a")).toBe(false);
    expect(isReservedToolLetter("p")).toBe(false);
    expect(isReservedToolLetter("j")).toBe(false);
  });

  it("T-chord map: T=Pointer, I=Scissors, A=Fade", () => {
    expect(TIMELINE_TOOL_LETTER_IDS.t).toBe("pointer");
    expect(TIMELINE_TOOL_LETTER_IDS.i).toBe("scissors");
    expect(TIMELINE_TOOL_LETTER_IDS.a).toBe("fade");
    expect(TIMELINE_TOOL_LETTER_IDS.f).toBeUndefined();
  });
});

describe("resolveTimelineShortcut", () => {
  it("maps view toggles X / I / ?", () => {
    expect(resolveTimelineShortcut(base({ key: "x" }))).toBe("toggle-mixer");
    expect(resolveTimelineShortcut(base({ key: "i" }))).toBe(
      "toggle-inspector",
    );
    expect(resolveTimelineShortcut(base({ key: "?" }))).toBe("help-open");
    expect(
      resolveTimelineShortcut(base({ key: "/", shift: true })),
    ).toBe("help-open");
  });

  it("maps transport Space / Shift+Space / Enter / Home / C / K / U / Z", () => {
    expect(resolveTimelineShortcut(base({ key: " ", code: "Space" }))).toBe(
      "play-pause",
    );
    expect(
      resolveTimelineShortcut(base({ key: " ", code: "Space", shift: true })),
    ).toBe("play-from-selection");
    expect(resolveTimelineShortcut(base({ key: "Enter" }))).toBe("stop-home");
    expect(resolveTimelineShortcut(base({ key: "Home", code: "Home" }))).toBe(
      "stop-home",
    );
    expect(resolveTimelineShortcut(base({ key: "c" }))).toBe("cycle-toggle");
    expect(resolveTimelineShortcut(base({ key: "l" }))).toBeNull();
    expect(resolveTimelineShortcut(base({ key: "k" }))).toBe(
      "metronome-toggle",
    );
    expect(resolveTimelineShortcut(base({ key: "u" }))).toBe("cycle-from-clip");
    expect(resolveTimelineShortcut(base({ key: "u", mod: true }))).toBe(
      "cycle-from-clip",
    );
    expect(resolveTimelineShortcut(base({ key: "z" }))).toBe("fit-zoom");
  });

  it("bare letters never switch tools; A stays free; I stays Inspector", () => {
    expect(resolveTimelineShortcut(base({ key: "a" }))).toBeNull();
    expect(resolveTimelineShortcut(base({ key: "p" }))).toBeNull();
    expect(resolveTimelineShortcut(base({ key: "e" }))).toBeNull();
    expect(resolveTimelineShortcut(base({ key: "j" }))).toBeNull();
    expect(resolveTimelineShortcut(base({ key: "m" }))).toBeNull();
    expect(resolveTimelineShortcut(base({ key: "s" }))).toBeNull();
    expect(resolveTimelineShortcut(base({ key: "g" }))).toBeNull();
    expect(resolveTimelineShortcut(base({ key: "r" }))).toBeNull();
    expect(resolveTimelineShortcut(base({ key: "y" }))).toBeNull();
    expect(resolveTimelineShortcut(base({ key: "f" }))).toBeNull();
    expect(resolveTimelineShortcut(base({ key: "i" }))).toBe(
      "toggle-inspector",
    );
    expect(resolveTimelineShortcut(base({ key: "w" }))).toBe("wand-tool");
    expect(resolveTimelineShortcut(base({ key: "[" }))).toBe("setlist-prev");
    expect(resolveTimelineShortcut(base({ key: "]" }))).toBe("setlist-next");
    expect(resolveTimelineShortcut(base({ key: "t" }))).toBe(
      "tool-menu-toggle",
    );
  });

  it("T-chord second key picks tools (T=Pointer, I=Scissors, A=Fade)", () => {
    expect(
      resolveTimelineShortcut(base({ key: "t", toolMenuOpen: true })),
    ).toEqual({ type: "tool-letter", letter: "t" });
    expect(
      resolveTimelineShortcut(base({ key: "i", toolMenuOpen: true })),
    ).toEqual({ type: "tool-letter", letter: "i" });
    expect(
      resolveTimelineShortcut(base({ key: "a", toolMenuOpen: true })),
    ).toEqual({ type: "tool-letter", letter: "a" });
    expect(
      resolveTimelineShortcut(base({ key: "p", toolMenuOpen: true })),
    ).toEqual({ type: "tool-letter", letter: "p" });
    expect(
      resolveTimelineShortcut(base({ key: "y", toolMenuOpen: true })),
    ).toEqual({ type: "tool-letter", letter: "y" });
    // Non-tool letters still fall through to globals while menu is open.
    expect(
      resolveTimelineShortcut(base({ key: "c", toolMenuOpen: true })),
    ).toBe("cycle-toggle");
    expect(
      resolveTimelineShortcut(base({ key: "x", toolMenuOpen: true })),
    ).toBe("toggle-mixer");
  });

  it("maps clip edit modifiers", () => {
    expect(resolveTimelineShortcut(base({ key: "t", mod: true }))).toBe(
      "split-at-playhead",
    );
    expect(resolveTimelineShortcut(base({ key: "j", mod: true }))).toBe(
      "join-adjacent",
    );
    expect(resolveTimelineShortcut(base({ key: "a", mod: true }))).toBe(
      "select-all",
    );
    expect(resolveTimelineShortcut(base({ key: "d", mod: true }))).toBe(
      "duplicate",
    );
    expect(resolveTimelineShortcut(base({ key: "Escape" }))).toBe("escape");
  });

  it("maps ⌥←/→ to clip nudge and bare arrows to locator", () => {
    expect(resolveTimelineShortcut(base({ key: "ArrowLeft" }))).toBe(
      "locator-left",
    );
    expect(
      resolveTimelineShortcut(base({ key: "ArrowLeft", alt: true })),
    ).toBe("nudge-clip-left");
    expect(
      resolveTimelineShortcut(base({ key: "ArrowRight", alt: true })),
    ).toBe("nudge-clip-right");
  });

  it("maps zoom chords without bare tool letters", () => {
    expect(
      resolveTimelineShortcut(base({ key: "ArrowLeft", mod: true })),
    ).toBe("zoom-h-out");
    expect(
      resolveTimelineShortcut(base({ key: "ArrowUp", mod: true })),
    ).toBe("zoom-v-in");
    expect(resolveTimelineShortcut(base({ key: "p" }))).toBeNull();
    expect(resolveTimelineShortcut(base({ key: "a" }))).toBeNull();
  });

  it("maps wand menu digits and tap arrows", () => {
    expect(
      resolveTimelineShortcut(base({ key: "1", wandMenuOpen: true })),
    ).toBe("wand-tekst");
    expect(
      resolveTimelineShortcut(
        base({ key: "ArrowUp", tapToolActive: true }),
      ),
    ).toBe("tap-line-prev");
  });
});
