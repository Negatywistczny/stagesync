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
      partial: Omit<StageCueMessage, "sentAtMs" | "ttlMs"> & {
        ttlMs?: number;
        sentAtMs?: number;
      },
    ): StageCueMessage {
      const msg: StageCueMessage = {
        type: "stage_cue",
        text: partial.text,
        roles: partial.roles,
        ttlMs: partial.ttlMs ?? 6000,
        sentAtMs: partial.sentAtMs ?? Date.now(),
      };
      for (const listener of listeners) {
        listener(msg);
      }
      return msg;
    },
  };
}

export type StageHub = ReturnType<typeof createStageHub>;
