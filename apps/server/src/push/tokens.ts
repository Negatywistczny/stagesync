/**
 * Persist FCM / WebPush device tokens under data/host/push-tokens.json (#810).
 * No secrets — tokens are opaque device endpoints.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  PushPlatformSchema,
  type PushPlatform,
  type PushTokenRegisterBody,
} from "@stagesync/shared";
import { writeJsonAtomic } from "../storage/atomic-write.js";

export type StoredPushToken = {
  token: string;
  platform: PushPlatform;
  deviceLabel?: string;
  updatedAt: string;
};

type TokenFile = {
  tokens: StoredPushToken[];
};

function tokenFilePath(dataDir: string): string {
  return join(dataDir, "host", "push-tokens.json");
}

async function readFileSafe(path: string): Promise<TokenFile> {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as TokenFile;
    if (!parsed || !Array.isArray(parsed.tokens)) return { tokens: [] };
    return {
      tokens: parsed.tokens.filter((t) => {
        if (!t || typeof t.token !== "string" || t.token.length < 8)
          return false;
        return PushPlatformSchema.safeParse(t.platform).success;
      }),
    };
  } catch {
    return { tokens: [] };
  }
}

export function createPushTokenStore(dataDir: string) {
  const path = tokenFilePath(dataDir);

  return {
    path,
    async list(): Promise<StoredPushToken[]> {
      return (await readFileSafe(path)).tokens;
    },
    async upsert(body: PushTokenRegisterBody): Promise<StoredPushToken> {
      const file = await readFileSafe(path);
      const updatedAt = new Date().toISOString();
      const next: StoredPushToken = {
        token: body.token,
        platform: body.platform,
        ...(body.deviceLabel ? { deviceLabel: body.deviceLabel } : {}),
        updatedAt,
      };
      const without = file.tokens.filter((t) => t.token !== body.token);
      without.push(next);
      // Cap fan-out list (LAN show — not a marketing DB).
      const capped = without.slice(-200);
      await writeJsonAtomic(path, { tokens: capped });
      return next;
    },
    async remove(token: string): Promise<boolean> {
      const file = await readFileSafe(path);
      const next = file.tokens.filter((t) => t.token !== token);
      if (next.length === file.tokens.length) return false;
      await writeJsonAtomic(path, { tokens: next });
      return true;
    },
  };
}

export type PushTokenStore = ReturnType<typeof createPushTokenStore>;
