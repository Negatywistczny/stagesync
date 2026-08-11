import { describe, expect, it } from "vitest";
import { SETLIST_DEFAULT_TIME_BUDGET_MINUTES } from "../project/schema.js";
import {
  buildSetlistView,
  defaultSetlist,
  formatSetDurationMs,
  itemsFromProjectIds,
  normalizeSetlist,
  projectIdsFromItems,
  pruneSetlistToLibrary,
  resolveSetlistNext,
  SETLIST_SONG_DURATION_ESTIMATE_MS,
  sumSetlistDurationMs,
} from "./setlist.js";
import type { Library } from "../project/schema.js";

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
          {
            type: "project",
            projectId: "11111111-1111-4111-8111-111111111111",
          },
          {
            type: "break",
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            label: "Przerwa / Zapowiedź",
            durationMinutes: 10,
          },
          {
            type: "project",
            projectId: "99999999-9999-4999-8999-999999999999",
          },
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
    expect(pruned.projectIds).toEqual(["11111111-1111-4111-8111-111111111111"]);
    expect(pruned.items[1]).toMatchObject({
      type: "break",
      durationMinutes: 10,
    });
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
          {
            type: "project",
            projectId: "11111111-1111-4111-8111-111111111111",
          },
          {
            type: "break",
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            label: "Przerwa / Zapowiedź",
            durationMinutes: 5,
          },
          {
            type: "project",
            projectId: "99999999-9999-4999-8999-999999999999",
          },
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

  it("normalize defaults break label and clamps time budget", () => {
    const n = normalizeSetlist({
      enabled: true,
      items: [
        {
          type: "break",
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          label: "   ",
          durationMinutes: 5,
        },
      ],
      timeBudgetMinutes: 9999,
    });
    expect(n.items[0]).toMatchObject({
      type: "break",
      label: "Przerwa / Zapowiedź",
    });
    expect(n.timeBudgetMinutes).toBe(24 * 60);
  });

  it("resolveSetlistNext returns null when current is outside list", () => {
    const setlist = {
      ...defaultSetlist(),
      enabled: true,
      projectIds: ["11111111-1111-4111-8111-111111111111"],
      items: [
        {
          type: "project" as const,
          projectId: "11111111-1111-4111-8111-111111111111",
        },
      ],
    };
    expect(resolveSetlistNext(setlist, library, "not-in-list")).toBeNull();
    expect(
      resolveSetlistNext(
        { ...setlist, projectIds: [], items: setlist.items },
        library,
        null,
      ),
    ).toBeNull();
  });

  it("buildSetlistView uses projectIds fallback when items all pruned", () => {
    const view = buildSetlistView(
      {
        version: 1,
        enabled: true,
        items: [
          {
            type: "project",
            projectId: "99999999-9999-4999-8999-999999999999",
          },
        ],
        projectIds: ["99999999-9999-4999-8999-999999999999"],
        autoAdvance: { enabled: false },
        timeBudgetMinutes: 45,
      },
      library,
      null,
    );
    // pruned items empty but original items non-empty → projectIds rebuild path
    expect(view.items).toEqual([]);
    expect(
      view.warnings.some((w) => w.code === "SETLIST_MISSING_PROJECT"),
    ).toBe(true);
  });

  it("formatSetDurationMs pads seconds and clamps negative", () => {
    expect(formatSetDurationMs(0)).toBe("0:00");
    expect(formatSetDurationMs(1000)).toBe("0:01");
    expect(formatSetDurationMs(61_000)).toBe("1:01");
    expect(formatSetDurationMs(-500)).toBe("0:00");
    expect(formatSetDurationMs(1499)).toBe("0:01");
    expect(formatSetDurationMs(Number.NaN)).toBe("0:00");
    expect(formatSetDurationMs(Number.POSITIVE_INFINITY)).toBe("0:00");
  });

  it("sumSetlistDurationMs totals item durations", () => {
    expect(sumSetlistDurationMs([])).toBe(0);
    expect(
      sumSetlistDurationMs([
        {
          type: "project",
          projectId: "11111111-1111-4111-8111-111111111111",
          name: "A",
          durationMs: 1000,
        },
        {
          type: "break",
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          label: "P",
          durationMinutes: 1,
          durationMs: 2000,
        },
      ]),
    ).toBe(3000);
  });

  it("projectIdsFromItems skips breaks, blanks, and dedupes with 256 cap", () => {
    expect(projectIdsFromItems([])).toEqual([]);
    const a = "11111111-1111-4111-8111-111111111111";
    const b = "22222222-2222-4222-8222-222222222222";
    expect(
      projectIdsFromItems([
        { type: "project", projectId: a },
        {
          type: "break",
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          label: "P",
          durationMinutes: 1,
        },
        { type: "project", projectId: a },
        { type: "project", projectId: b },
      ]),
    ).toEqual([a, b]);

    const many = Array.from({ length: 300 }, (_, i) => {
      const hex = i.toString(16).padStart(12, "0");
      return {
        type: "project" as const,
        projectId: `00000000-0000-4000-8000-${hex}`,
      };
    });
    expect(projectIdsFromItems(many)).toHaveLength(256);
  });

  it("itemsFromProjectIds skips blank ids, dedupes, and caps at 256", () => {
    expect(itemsFromProjectIds([])).toEqual([]);
    const a = "11111111-1111-4111-8111-111111111111";
    expect(itemsFromProjectIds(["", a, a, ""])).toEqual([
      { type: "project", projectId: a },
    ]);
    const many = Array.from({ length: 300 }, (_, i) => {
      const hex = i.toString(16).padStart(12, "0");
      return `00000000-0000-4000-8000-${hex}`;
    });
    expect(itemsFromProjectIds(many)).toHaveLength(256);
  });

  it("buildSetlistView prefers catalog durationMs over estimate", () => {
    const withDuration: Library = {
      version: 1,
      projects: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "A",
          durationMs: 180_000,
          defaultBpm: 120,
          keyLabel: "Am",
        },
      ],
    };
    const view = buildSetlistView(
      {
        version: 1,
        enabled: true,
        items: [
          {
            type: "project",
            projectId: "11111111-1111-4111-8111-111111111111",
          },
        ],
        projectIds: ["11111111-1111-4111-8111-111111111111"],
        autoAdvance: { enabled: false },
        timeBudgetMinutes: 45,
      },
      withDuration,
      null,
    );
    expect(view.items[0]).toMatchObject({
      type: "project",
      durationMs: 180_000,
      estimated: false,
    });
    expect(view.totalDurationMs).toBe(180_000);
  });
});
