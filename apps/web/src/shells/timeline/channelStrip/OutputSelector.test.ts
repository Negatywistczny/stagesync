import { describe, expect, it } from "vitest";
import { parseOutputDest, serializeOutputDest } from "./OutputSelector.js";

describe("OutputSelector dest helpers", () => {
  it("serializeOutputDest maps master and bus", () => {
    expect(serializeOutputDest(undefined)).toBe("master");
    expect(serializeOutputDest({ kind: "master" })).toBe("master");
    expect(serializeOutputDest({ kind: "bus", busId: "b1" })).toBe("bus:b1");
  });

  it("parseOutputDest round-trips and rejects empty bus id", () => {
    expect(parseOutputDest("master")).toEqual({ kind: "master" });
    expect(parseOutputDest("bus:abc")).toEqual({ kind: "bus", busId: "abc" });
    expect(parseOutputDest("bus:")).toEqual({ kind: "master" });
    expect(parseOutputDest("other")).toEqual({ kind: "master" });
    expect(parseOutputDest("")).toEqual({ kind: "master" });
  });
});
