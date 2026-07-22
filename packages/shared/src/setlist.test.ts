import { describe, expect, it } from "vitest";
import { SETLIST_DEFAULT_TIME_BUDGET_MINUTES } from "./schema.js";
import {
  buildSetlistView,
  defaultSetlist,
  formatSetDurationMs,
  normalizeSetlist,
  pruneSetlistToLibrary,
  resolveSetlistNext,
  SETLIST_SONG_DURATION_ESTIMATE_MS,
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
  it("normalize dedupes project ids", () => {
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
    expect(n.items).toHaveLength(2);
    expect(n.autoAdvance.enabled).toBe(true);
    expect(n.timeBudgetMinutes).toBe(SETLIST_DEFAULT_TIME_BUDGET_MINUTES);
  });

  it("normalize keeps breaks between projects", () => {
    const n = normalizeSetlist({
      enabled: true,
      items: [
        { type: "project", projectId: "11111111-1111-4111-8111-111111111111" },
        {
          type: "break",
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          label: "Przerwa",
          durationMinutes: 5,
        },
        { type: "project", projectId: "22222222-2222-4222-8222-222222222222" },
      ],
    });
    expect(n.items).toHaveLength(3);
    expect(n.projectIds).toEqual([
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]);
  });

  it("prune drops unknown project ids but keeps breaks", () => {
    const pruned = pruneSetlistToLibrary(
      {
        enabled: true,
        items: [
          { type: "project", projectId: "11111111-1111-4111-8111-111111111111" },
          {
            type: "break",
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            label: "Przerwa / Zapowiedź",
            durationMinutes: 10,
          },
          { type: "project", projectId: "99999999-9999-4999-8999-999999999999" },
        ],
        projectIds: [
          "11111111-1111-4111-8111-111111111111",
          "99999999-9999-4999-8999-999999999999",
        ],
        autoAdvance: { enabled: false },
        timeBudgetMinutes: 45,
      },
      library,
    );
    expect(pruned.items).toHaveLength(2);
    expect(pruned.projectIds).toEqual([
      "11111111-1111-4111-8111-111111111111",
    ]);
    expect(pruned.items[1]).toMatchObject({ type: "break", durationMinutes: 10 });
  });

  it("resolve next after current (projects only)", () => {
    const setlist = {
      ...defaultSetlist(),
      enabled: true,
      items: [
        {
          type: "project" as const,
          projectId: "11111111-1111-4111-8111-111111111111",
        },
        {
          type: "break" as const,
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          label: "Przerwa / Zapowiedź",
          durationMinutes: 5,
        },
        {
          type: "project" as const,
          projectId: "22222222-2222-4222-8222-222222222222",
        },
      ],
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

  it("buildSetlistView warns on missing and sums duration", () => {
    const view = buildSetlistView(
      {
        version: 1,
        enabled: true,
        items: [
          { type: "project", projectId: "11111111-1111-4111-8111-111111111111" },
          {
            type: "break",
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            label: "Przerwa / Zapowiedź",
            durationMinutes: 5,
          },
          { type: "project", projectId: "99999999-9999-4999-8999-999999999999" },
        ],
        projectIds: [
          "11111111-1111-4111-8111-111111111111",
          "99999999-9999-4999-8999-999999999999",
        ],
        autoAdvance: { enabled: false },
        timeBudgetMinutes: 45,
      },
      library,
      "11111111-1111-4111-8111-111111111111",
    );
    expect(view.next?.name).toBeUndefined();
    expect(view.entries).toHaveLength(1);
    expect(view.items).toHaveLength(2);
    expect(view.totalDurationMs).toBe(
      SETLIST_SONG_DURATION_ESTIMATE_MS + 5 * 60 * 1000,
    );
    expect(formatSetDurationMs(view.totalDurationMs)).toMatch(/^\d+:\d{2}$/);
    expect(
      view.warnings.some((w) => w.code === "SETLIST_MISSING_PROJECT"),
    ).toBe(true);
  });
});
