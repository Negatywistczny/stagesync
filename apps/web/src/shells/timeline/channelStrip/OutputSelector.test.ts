import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  OutputSelector,
  parseOutputDest,
  serializeOutputDest,
} from "./OutputSelector.js";

describe("OutputSelector dest helpers", () => {
  it("parseOutputDest round-trips and rejects empty bus id", () => {
    expect(parseOutputDest("master")).toEqual({ kind: "master" });
    expect(parseOutputDest("bus:abc")).toEqual({ kind: "bus", busId: "abc" });
    expect(parseOutputDest("hw:out1")).toEqual({
      kind: "hw_out",
      hwOutputId: "out1",
    });
    expect(parseOutputDest("bus:")).toEqual({ kind: "master" });
    expect(parseOutputDest("other")).toEqual({ kind: "master" });
    expect(parseOutputDest("")).toEqual({ kind: "master" });
  });

  it("serializeOutputDest maps master, bus, and hw", () => {
    expect(serializeOutputDest(undefined)).toBe("master");
    expect(serializeOutputDest({ kind: "master" })).toBe("master");
    expect(serializeOutputDest({ kind: "bus", busId: "b1" })).toBe("bus:b1");
    expect(
      serializeOutputDest({ kind: "hw_out", hwOutputId: "h1" }),
    ).toBe("hw:h1");
  });
});

describe("OutputSelector control", () => {
  it("defaults aria-label to Out and disables when single option", () => {
    const out = renderToStaticMarkup(
      createElement(OutputSelector, {
        value: "master",
        options: [{ value: "master", label: "Master" }],
        onChange: () => {},
      }),
    );
    expect(out).toContain('aria-label="Out"');
    expect(out).toContain("disabled");
  });

  it("keeps select enabled with multiple options", () => {
    const out = renderToStaticMarkup(
      createElement(OutputSelector, {
        value: "master",
        options: [
          { value: "master", label: "Master" },
          { value: "bus:b1", label: "Bus 1" },
        ],
        onChange: () => {},
        "aria-label": "Out ścieżki",
      }),
    );
    expect(out).toContain('aria-label="Out ścieżki"');
    expect(out).not.toMatch(/<select[^>]*\sdisabled/);
  });
});
