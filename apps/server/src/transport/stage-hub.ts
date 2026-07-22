export type StageCueMessage = {
  type: "stage_cue";
  text: string;
  roles?: string[];
  ttlMs: number;
  sentAtMs: number;
};

type Listener = (msg: StageCueMessage) => void;

export function createStageHub() {
  const listeners = new Set<Listener>();

  return {
    onMessage(listener: Listener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    broadcast(
      partial: Omit<StageCueMessage, "sentAtMs"> & { sentAtMs?: number },
    ): StageCueMessage {
      const ttlRaw = partial.ttlMs ?? 6_000;
      const ttlMs = Number.isFinite(ttlRaw)
        ? Math.min(300_000, Math.max(1, Math.trunc(ttlRaw)))
        : 6_000;
      const msg: StageCueMessage = {
        type: "stage_cue",
        text: String(partial.text).slice(0, 200),
        roles: partial.roles,
        ttlMs,
        sentAtMs: partial.sentAtMs ?? Date.now(),
      };
      for (const listener of listeners) {
        try {
          listener(msg);
        } catch (err) {
          console.error("[stagesync-server] stage listener error", err);
        }
      }
      return msg;
    },
  };
}

export type StageHub = ReturnType<typeof createStageHub>;
