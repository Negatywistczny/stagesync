import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PROTOCOL_VERSION } from "./schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");

describe("PROTOCOL_VERSION Android parity", () => {
  it("matches Performer and Console ShellConfig constants", () => {
    const performer = readFileSync(
      join(
        repoRoot,
        "apps/performer/android/app/src/main/java/com/stagesync/performer/ShellConfig.kt",
      ),
      "utf8",
    );
    const consoleCfg = readFileSync(
      join(
        repoRoot,
        "apps/console/android/app/src/main/java/com/stagesync/console/ShellConfig.kt",
      ),
      "utf8",
    );
    const re = new RegExp(`PROTOCOL_VERSION\\s*=\\s*${PROTOCOL_VERSION}\\b`);
    expect(performer).toMatch(re);
    expect(consoleCfg).toMatch(re);
  });
});
