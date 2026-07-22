/**
 * Connected Client presence (displayName + roles) for Admin Scena.
 */

const MAX_NAME_LEN = 40;
const MAX_CLIENTS = 256;
const ALLOWED_ROLES = new Set([
  "karaoke",
  "grid",
  "score",
  "drums",
  "timeline",
]);

export type PresenceClient = {
  id: string;
  displayName: string | null;
  roles: string[];
  /** One-way latency reported by client (ms), or null. */
  latencyMs: number | null;
  connectedAt: number;
  updatedAt: number;
};

export function createClientPresence() {
  const clients = new Map<string, PresenceClient>();

  function normalizeDisplayName(raw: unknown): string | null {
    const name = String(raw ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_NAME_LEN);
    return name || null;
  }

  function normalizeRoles(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    const out: string[] = [];
    for (const role of raw) {
      if (typeof role === "string" && ALLOWED_ROLES.has(role) && !out.includes(role)) {
        out.push(role);
      }
      if (out.length >= 2) break;
    }
    return out;
  }

  function ensure(id: string): PresenceClient {
    let entry = clients.get(id);
    if (!entry) {
      if (clients.size >= MAX_CLIENTS) {
        let oldestId: string | null = null;
        let oldestAt = Number.POSITIVE_INFINITY;
        for (const [cid, c] of clients) {
          if (c.connectedAt < oldestAt) {
            oldestAt = c.connectedAt;
            oldestId = cid;
          }
        }
        if (oldestId) clients.delete(oldestId);
      }
      const now = Date.now();
      entry = {
        id,
        displayName: null,
        roles: [],
        latencyMs: null,
        connectedAt: now,
        updatedAt: now,
      };
      clients.set(id, entry);
    }
    return entry;
  }

  return {
    connect(id: string): PresenceClient {
      return { ...ensure(id), roles: [...ensure(id).roles] };
    },

    upsert(
      id: string,
      payload: {
        displayName?: unknown;
        roles?: unknown;
        latencyMs?: unknown;
      } = {},
    ): PresenceClient {
      const entry = ensure(id);
      if (Object.prototype.hasOwnProperty.call(payload, "displayName")) {
        entry.displayName = normalizeDisplayName(payload.displayName);
      }
      if (Object.prototype.hasOwnProperty.call(payload, "roles")) {
        entry.roles = normalizeRoles(payload.roles);
      }
      if (Object.prototype.hasOwnProperty.call(payload, "latencyMs")) {
        const n = Number(payload.latencyMs);
        entry.latencyMs =
          Number.isFinite(n) && n >= 0
            ? Math.min(60_000, Math.round(n))
            : null;
      }
      entry.updatedAt = Date.now();
      return { ...entry, roles: [...entry.roles] };
    },

    remove(id: string): void {
      clients.delete(id);
    },

    list(): PresenceClient[] {
      return [...clients.values()].map((c) => ({
        ...c,
        roles: [...c.roles],
      }));
    },
  };
}

export type ClientPresence = ReturnType<typeof createClientPresence>;
