import { describe, it, expect } from "vitest";
import {
  resolveClientPhase,
  presenceTitle,
  connectionStatusLabel,
  formatRoleLabels,
  formatSessionRoles,
  formatExpiresAt,
  CLIENT_STALE_MS,
  type PresenceClient,
} from "./stagePresence.js";

describe("stagePresence", () => {
  const now = 100000;

  it("resolves client phases correctly", () => {
    const staleClient: PresenceClient = {
      clientId: "c1",
      displayName: "iPad",
      roles: ["karaoke"],
      updatedAt: now - CLIENT_STALE_MS - 1000,
    } as any;
    expect(resolveClientPhase(staleClient, now)).toBe("stale");

    const noDataClient: PresenceClient = {
      clientId: "c2",
      displayName: "",
      roles: [],
      updatedAt: now - 1000,
    } as any;
    expect(resolveClientPhase(noDataClient, now)).toBe("awaiting-data");

    const noRoleClient: PresenceClient = {
      clientId: "c3",
      displayName: "Tablet",
      roles: [],
      updatedAt: now - 1000,
    } as any;
    expect(resolveClientPhase(noRoleClient, now)).toBe("awaiting-role");

    const readyClient: PresenceClient = {
      clientId: "c4",
      displayName: "Stage Screen",
      roles: ["score"],
      updatedAt: now - 1000,
    } as any;
    expect(resolveClientPhase(readyClient, now)).toBe("ready");
  });

  it("provides human readable titles and status labels for phases", () => {
    expect(presenceTitle("stale")).toContain("brak świeżych danych");
    expect(connectionStatusLabel("ready")).toBe("Online");
    expect(connectionStatusLabel("stale")).toBe("Brak sygnału");
  });

  it("formats role labels and session roles", () => {
    expect(formatRoleLabels(["karaoke", "grid"])).toBe("Tekst, Akordy");
    expect(formatSessionRoles(undefined)).toBe("wszyscy");
    expect(formatSessionRoles(["score"])).toBe("Partytura");
  });

  it("formats expiresAt date correctly", () => {
    const msg = {
      expiresAt: new Date("2026-08-12T20:00:00Z").toISOString(),
    } as any;
    const formatted = formatExpiresAt(msg);
    expect(formatted).toContain("do ");
  });
});
