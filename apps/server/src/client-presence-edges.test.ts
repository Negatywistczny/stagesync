import { describe, expect, it } from "vitest";
import { createClientPresence } from "./client-presence.js";

describe("client-presence edges", () => {
  it("truncates displayName and rejects empty after trim", () => {
    const presence = createClientPresence();
    presence.connect("x");
    presence.upsert("x", { displayName: `  ${"A".repeat(80)}  ` });
    expect(presence.list()[0]?.displayName).toBe("A".repeat(40));
    presence.upsert("x", { displayName: "   " });
    expect(presence.list()[0]?.displayName).toBeNull();
  });

  it("keeps at most two allowed roles and ignores non-arrays", () => {
    const presence = createClientPresence();
    presence.upsert("y", {
      roles: ["timeline", "score", "drums", "karaoke"],
    });
    expect(presence.list()[0]?.roles).toEqual(["timeline", "score"]);
    presence.upsert("y", { roles: "drums" });
    expect(presence.list()[0]?.roles).toEqual([]);
  });

  it("connect returns a shallow copy and list clones roles", () => {
    const presence = createClientPresence();
    const connected = presence.connect("z");
    presence.upsert("z", { roles: ["grid"] });
    expect(connected.roles).toEqual([]);
    const listed = presence.list()[0]!;
    listed.roles.push("drums");
    expect(presence.list()[0]?.roles).toEqual(["grid"]);
  });
});
