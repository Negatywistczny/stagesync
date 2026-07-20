import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import { buildGridLiveContext } from "./clientGrid.js";
import { pencilAkordyClick } from "./akordyEdit.js";

describe("clientGrid", () => {
  it("resolves current akord at ticks", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = pencilAkordyClick(p, 0, "Dm");
    const ctx = buildGridLiveContext(p, 100);
    expect(ctx.current?.symbol).toBe("Dm");
    expect(ctx.emptyReason).toBeNull();
  });
});
