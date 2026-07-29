import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const devAppSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "DevApp.tsx"),
  "utf8",
);

describe("DevApp", () => {
  it("does not register /_dev/preview (preview bypasses outer RouterProvider)", () => {
    expect(devAppSource).not.toContain("/_dev/preview");
  });
});
