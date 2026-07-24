/**
 * Fanout setlist snapshots on `/ws/transport` (mirrors live_desk / stage-hub).
 */

import type { SetlistSnapshotMessage, SetlistView } from "@stagesync/shared";

type Listener = (msg: SetlistSnapshotMessage) => void;

export function setlistSnapshotFromView(
  view: SetlistView,
  sentAtMs = Date.now(),
): SetlistSnapshotMessage {
  return {
    type: "setlist_snapshot",
    projectIds: view.projectIds,
    enabled: view.enabled,
    autoAdvance: { enabled: view.autoAdvance.enabled },
    currentIndex: view.currentIndex,
    next: view.next,
    sentAtMs,
  };
}

export function createSetlistHub() {
  let last: SetlistSnapshotMessage | null = null;
  const listeners = new Set<Listener>();

  return {
    publish(msg: SetlistSnapshotMessage): SetlistSnapshotMessage {
      last = msg;
      for (const listener of listeners) {
        listener(msg);
      }
      return msg;
    },

    publishFromView(view: SetlistView, sentAtMs = Date.now()): SetlistSnapshotMessage {
      return this.publish(setlistSnapshotFromView(view, sentAtMs));
    },

    snapshotMessage(): SetlistSnapshotMessage | null {
      return last;
    },

    onMessage(listener: Listener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type SetlistHub = ReturnType<typeof createSetlistHub>;
