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

  it("skips empty ids and caps at 1024 entries", () => {
    expect(
      mergePreserveById([{ id: "", name: "x" }], [{ id: "", name: "y" }]),
    ).toEqual([]);
    const client = Array.from({ length: 1024 }, (_, i) => ({
      id: `c${i}`,
      name: `C${i}`,
    }));
    const server = [{ id: "server-only", name: "S" }];
    const merged = mergePreserveById(server, client);
    expect(merged).toHaveLength(1024);
    expect(merged.some((x) => x.id === "server-only")).toBe(false);
    expect(merged[0]?.id).toBe("c0");
  });
});
