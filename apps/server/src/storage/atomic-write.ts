import { randomBytes } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/** Atomic JSON write: temp file in the same directory, then rename. */
export async function writeJsonAtomic(
  filePath: string,
  value: unknown,
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const nonce = randomBytes(6).toString("hex");
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.${nonce}.tmp`;
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(tmpPath, payload, "utf8");
  await rename(tmpPath, filePath);
}
