import { randomUUID } from "node:crypto";

export type SessionStageMessage = {
  id: string;
  text: string;
  roles?: string[];
  ttlMs: number;
  sentAtMs: number;
  priority?: "normal" | "alert";
  /** ISO wall-clock expiry; omitted when `ttlMs === 0` (infinite). */
  expiresAt?: string;
};

export type StageCueMessage = {
  type: "stage_cue";
  id: string;
  text: string;
  roles?: string[];
  ttlMs: number;
  sentAtMs: number;
  priority?: "normal" | "alert";
  expiresAt?: string;
};

export type StageCueDismissMessage = {
  type: "stage_cue_dismiss";
  id?: string;
  clearAll?: boolean;
  sentAtMs: number;
};

type HubOutbound = StageCueMessage | StageCueDismissMessage;
type Listener = (msg: HubOutbound) => void;

function toCue(msg: SessionStageMessage): StageCueMessage {
  return {
    type: "stage_cue",
    id: msg.id,
    text: msg.text,
    roles: msg.roles,
    ttlMs: msg.ttlMs,
    sentAtMs: msg.sentAtMs,
    priority: msg.priority,
    expiresAt: msg.expiresAt,
  };
}

export function createStageHub() {
  const listeners = new Set<Listener>();
  const messages = new Map<string, SessionStageMessage>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  function emit(msg: HubOutbound): void {
    for (const listener of listeners) {
      listener(msg);
    }
  }

  function clearTimer(id: string): void {
    const timer = timers.get(id);
    if (timer == null) return;
    clearTimeout(timer);
    timers.delete(id);
  }

  function removeMessage(id: string): boolean {
    if (!messages.has(id)) return false;
    clearTimer(id);
    messages.delete(id);
    return true;
  }

  function dismissInternal(id: string): boolean {
    if (!removeMessage(id)) return false;
    emit({
      type: "stage_cue_dismiss",
      id,
      sentAtMs: Date.now(),
    });
    return true;
  }

  return {
    onMessage(listener: Listener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    list(): SessionStageMessage[] {
      return [...messages.values()];
    },

    snapshotCues(): StageCueMessage[] {
      return [...messages.values()].map(toCue);
    },

    broadcast(
      partial: Omit<StageCueMessage, "sentAtMs" | "ttlMs" | "id" | "expiresAt"> & {
        id?: string;
        ttlMs?: number;
        sentAtMs?: number;
        priority?: "normal" | "alert";
      },
    ): StageCueMessage {
      const id = partial.id ?? randomUUID();
      const ttlMs = partial.ttlMs ?? 6000;
      const sentAtMs = partial.sentAtMs ?? Date.now();
      const msg: SessionStageMessage = {
        id,
        text: partial.text,
        roles: partial.roles,
        ttlMs,
        sentAtMs,
        priority: partial.priority,
        expiresAt:
          ttlMs > 0 ? new Date(sentAtMs + ttlMs).toISOString() : undefined,
      };

      clearTimer(id);
      messages.set(id, msg);

      if (ttlMs > 0) {
        timers.set(
          id,
          setTimeout(() => {
            dismissInternal(id);
          }, ttlMs),
        );
      }

      const cue = toCue(msg);
      emit(cue);
      return cue;
    },

    dismiss(id: string): boolean {
      return dismissInternal(id);
    },

    clearAll(): void {
      for (const id of [...timers.keys()]) {
        clearTimer(id);
      }
      messages.clear();
      emit({
        type: "stage_cue_dismiss",
        clearAll: true,
        sentAtMs: Date.now(),
      });
    },
  };
}

export type StageHub = ReturnType<typeof createStageHub>;
