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
      const msg: StageCueMessage = {
        type: "stage_cue",
        text: partial.text,
        roles: partial.roles,
        ttlMs: partial.ttlMs,
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
