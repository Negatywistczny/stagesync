/**
 * Live Desk settings (team transpose / sync-lead / remote edit) — SSOT + WS fanout.
 */

import {
  LiveDeskSettingsSchema,
  type LiveDeskMessage,
  type LiveDeskPatchBody,
  type LiveDeskSettings,
} from "@stagesync/shared";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export function defaultLiveDeskSettings(): LiveDeskSettings {
  return LiveDeskSettingsSchema.parse({});
}

type Listener = (msg: LiveDeskMessage) => void;

export function createLiveDeskStore(filePath: string) {
  let settings = defaultLiveDeskSettings();
  let loaded = false;
  const listeners = new Set<Listener>();

  async function ensureLoaded(): Promise<void> {
    if (loaded) return;
    loaded = true;
    try {
      const raw = JSON.parse(await readFile(filePath, "utf8")) as unknown;
      settings = LiveDeskSettingsSchema.parse(raw);
    } catch {
      settings = defaultLiveDeskSettings();
      try {
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, JSON.stringify(settings, null, 2), "utf8");
      } catch {
        /* ignore first-write failure */
      }
    }
  }

  async function persist(): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(settings, null, 2), "utf8");
  }

  function toMessage(sentAtMs = Date.now()): LiveDeskMessage {
    return {
      type: "live_desk",
      transpositionSemitones: settings.transpositionSemitones,
      syncLeadMs: settings.syncLeadMs,
      clientEditEnabled: settings.clientEditEnabled,
      sentAtMs,
    };
  }

  function emit(): LiveDeskMessage {
    const msg = toMessage();
    for (const listener of listeners) {
      listener(msg);
    }
    return msg;
  }

  return {
    async get(): Promise<LiveDeskSettings> {
      await ensureLoaded();
      return { ...settings };
    },

    async patch(body: LiveDeskPatchBody): Promise<LiveDeskSettings> {
      await ensureLoaded();
      settings = LiveDeskSettingsSchema.parse({
        ...settings,
        ...body,
      });
      await persist();
      emit();
      return { ...settings };
    },

    snapshotMessage(): LiveDeskMessage {
      return toMessage();
    },

    onMessage(listener: Listener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type LiveDeskStore = ReturnType<typeof createLiveDeskStore>;
