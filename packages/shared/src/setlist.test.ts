import { describe, expect, it } from "vitest";
import {
  buildSetlistView,
  defaultSetlist,
  normalizeSetlist,
  pruneSetlistToLibrary,
  resolveSetlistNext,
} from "./setlist.js";
import type { Library } from "./schema.js";

const library: Library = {
  version: 1,
  projects: [
    { id: "11111111-1111-4111-8111-111111111111", name: "A" },
    { id: "22222222-2222-4222-8222-222222222222", name: "B" },
    { id: "33333333-3333-4333-8333-333333333333", name: "C" },
  ],
};

describe("setlist helpers", () => {
  it("normalize dedupes ids", () => {
    const n = normalizeSetlist({
      enabled: true,
      projectIds: [
        "11111111-1111-4111-8111-111111111111",
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
      autoAdvance: { enabled: true },
    });
    expect(n.projectIds).toHaveLength(2);
    expect(n.autoAdvance.enabled).toBe(true);
  });

  it("prune drops unknown ids", () => {
    const pruned = pruneSetlistToLibrary(
      {
        enabled: true,
        projectIds: [
          "11111111-1111-4111-8111-111111111111",
          "99999999-9999-4999-8999-999999999999",
        ],
        autoAdvance: { enabled: false },
      },
      library,
    );
    expect(pruned.projectIds).toEqual([
      "11111111-1111-4111-8111-111111111111",
    ]);
  });

  it("resolve next after current", () => {
    const setlist = {
      ...defaultSetlist(),
      enabled: true,
      projectIds: [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
    };
    expect(
      resolveSetlistNext(
        setlist,
        library,
        "11111111-1111-4111-8111-111111111111",
      )?.name,
    ).toBe("B");
    expect(
      resolveSetlistNext(
        setlist,
        library,
        "22222222-2222-4222-8222-222222222222",
      ),
    ).toBeNull();
  });

  it("buildSetlistView warns on missing", () => {
    const view = buildSetlistView(
      {
        version: 1,
        enabled: true,
        projectIds: [
          "11111111-1111-4111-8111-111111111111",
          "99999999-9999-4999-8999-999999999999",
        ],
        autoAdvance: { enabled: false },
      },
      library,
      "11111111-1111-4111-8111-111111111111",
    );
    expect(view.next?.name).toBeUndefined();
    expect(view.entries).toHaveLength(1);
    expect(view.warnings.some((w) => w.code === "SETLIST_MISSING_PROJECT")).toBe(
      true,
    );
  });
});
