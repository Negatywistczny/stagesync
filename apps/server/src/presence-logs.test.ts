import { describe, expect, it } from "vitest";
import { createClientPresence } from "./client-presence.js";
import { createLogBuffer } from "./log-buffer.js";

describe("client-presence", () => {
  it("upserts displayName and roles", () => {
    const presence = createClientPresence();
    presence.connect("a");
    presence.upsert("a", {
      displayName: "  Zosia  ",
      roles: ["drums", "drums", "nope", "karaoke"],
    });
    const list = presence.list();
    expect(list).toHaveLength(1);
    expect(list[0]?.displayName).toBe("Zosia");
    expect(list[0]?.roles).toEqual(["drums", "karaoke"]);
    presence.remove("a");
    expect(presence.list()).toHaveLength(0);
  });
});

describe("log-buffer", () => {
  it("keeps max lines and clear empties", () => {
    const buffer = createLogBuffer({ maxLines: 3 });
    buffer.push("info", "a");
    buffer.push("info", "b");
    buffer.push("info", "c");
    buffer.push("info", "d");
    expect(buffer.getLines().map((l) => l.msg)).toEqual(["b", "c", "d"]);
    buffer.clear();
    expect(buffer.getLines()).toEqual([]);
  });
});
