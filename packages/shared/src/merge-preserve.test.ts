import { describe, expect, it } from "vitest";
import { mergePreserveById } from "./merge-preserve.js";

describe("mergePreserveById", () => {
  it("keeps server-only ids when client omits them", () => {
    const server = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ];
    const client = [{ id: "a", name: "A2" }];
    expect(mergePreserveById(server, client)).toEqual([
      { id: "a", name: "A2" },
      { id: "b", name: "B" },
    ]);
  });

  it("skips empty ids and keeps client-only entries", () => {
    expect(
      mergePreserveById(
        [{ id: "", name: "bad" }, { id: "s", name: "S" }],
        [{ id: "c", name: "C" }, { id: "", name: "also-bad" }],
      ),
    ).toEqual([
      { id: "c", name: "C" },
      { id: "s", name: "S" },
    ]);
  });

  it("caps merged size at 1024", () => {
    const client = Array.from({ length: 1024 }, (_, i) => ({
      id: `c${i}`,
      n: i,
    }));
    const server = [{ id: "server-only", n: -1 }];
    const merged = mergePreserveById(server, client);
    expect(merged).toHaveLength(1024);
    expect(merged.some((x) => x.id === "server-only")).toBe(false);
  });
});
