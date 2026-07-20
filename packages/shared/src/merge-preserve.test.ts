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
});
