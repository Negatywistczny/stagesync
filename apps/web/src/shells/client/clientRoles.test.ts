import { describe, it, expect } from "vitest";
import { CLIENT_ROLES } from "./clientRoles.js";

describe("clientRoles", () => {
  it("contains all required performer roles with labels and icons", () => {
    expect(CLIENT_ROLES).toHaveLength(4);
    const ids = CLIENT_ROLES.map((r) => r.id);
    expect(ids).toEqual(["karaoke", "grid", "score", "drums"]);

    for (const role of CLIENT_ROLES) {
      expect(role.label).toBeTruthy();
      expect(role.icon).toBeTruthy();
    }
  });
});
