import { copyFile, access } from "node:fs/promises";
import { constants } from "node:fs";

/**
 * Copy `filePath` to a timestamped `.bak` sibling before destructive overwrite.
 * No-op when the source file does not exist (ENOENT).
 */
export async function shadowBackup(
  filePath: string,
  label = "pre-migrate",
): Promise<string | null> {
  try {
    await access(filePath, constants.F_OK);
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return null;
    }
    throw err;
  }
  const bak = `${filePath}.${label}-${Date.now()}.bak`;
  await copyFile(filePath, bak);
  return bak;
}
