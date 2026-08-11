import type {
  PresenceClient,
  SessionStageMessage,
} from "@lib/shell-operator/setlistApi.js";
import shell from "../AdminShell.module.css";

export type ClientPhase = "awaiting-data" | "awaiting-role" | "stale" | "ready";
export type HeaderPresence = "online" | "empty" | "error";
export type CuePriority = "normal" | "alert";
export type StageCardId = "korekta" | "messages" | "clients";

export const ROLE_OPTIONS = [
  { id: "karaoke", label: "Tekst" },
  { id: "grid", label: "Akordy" },
  { id: "score", label: "Partytura" },
  { id: "drums", label: "Forma" },
] as const;

export const ROLE_LABELS: Record<string, string> = {
  karaoke: "Tekst",
  grid: "Akordy",
  score: "Partytura",
  drums: "Forma",
  timeline: "Timeline",
};

/** Match v4 `CLIENT_STALE_MS` — no fresh hello/latency within this window. */
export const CLIENT_STALE_MS = 10_000;

export type RoleId = (typeof ROLE_OPTIONS)[number]["id"];

export function resolveClientPhase(
  client: PresenceClient,
  now = Date.now(),
): ClientPhase {
  if (now - client.updatedAt > CLIENT_STALE_MS) return "stale";
  if (!client.displayName && client.roles.length === 0) return "awaiting-data";
  if (client.roles.length === 0) return "awaiting-role";
  return "ready";
}

export function presenceDotClass(phase: ClientPhase): string {
  if (phase === "ready") return shell.presenceDotOn ?? "";
  return shell.presenceDotPending ?? "";
}

export function presenceTitle(phase: ClientPhase): string {
  switch (phase) {
    case "awaiting-data":
      return "Połączony — brak informacji od klienta";
    case "stale":
      return "Połączony — brak świeżych danych od klienta";
    case "awaiting-role":
      return "Połączony — oczekuje na wybór roli";
    default:
      return "Połączony — rola wybrana";
  }
}

export function connectionStatusLabel(phase: ClientPhase): string {
  switch (phase) {
    case "awaiting-data":
      return "Łączenie";
    case "stale":
      return "Brak sygnału";
    case "awaiting-role":
      return "Bez roli";
    default:
      return "Online";
  }
}

export function formatRoleLabels(roles: string[]): string {
  if (roles.length === 0) return "";
  return roles.map((role) => ROLE_LABELS[role] ?? role).join(", ");
}

export function formatSessionRoles(
  roles: SessionStageMessage["roles"],
): string {
  if (!roles || roles.length === 0) return "wszyscy";
  return formatRoleLabels(roles);
}

export function formatExpiresAt(msg: SessionStageMessage): string {
  if (!msg.expiresAt) return "";
  const at = Date.parse(msg.expiresAt);
  if (!Number.isFinite(at)) return "";
  return ` · do ${new Date(at).toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}
