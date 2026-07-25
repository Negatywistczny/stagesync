/**
 * Safety Net — Master / Spare roles (#437).
 * Spare: no MIDI OUT (clock / PC / panic). Manual promote only (no auto-election).
 */

export type SafetyRole = "master" | "spare";

export function getSafetyRole(): SafetyRole {
  const raw = (process.env.STAGESYNC_SAFETY_ROLE ?? "").trim().toLowerCase();
  return raw === "spare" ? "spare" : "master";
}

/** MIDI OUT (clock, PC, panic) only on Master. */
export function isMidiOutAllowed(): boolean {
  return getSafetyRole() === "master";
}

/**
 * Promote this host to Master (runtime env). Caller should also persist
 * `STAGESYNC_SAFETY_ROLE=master` when using managed settings.
 */
export function promoteToMaster(): SafetyRole {
  process.env.STAGESYNC_SAFETY_ROLE = "master";
  return "master";
}

export function demoteToSpare(): SafetyRole {
  process.env.STAGESYNC_SAFETY_ROLE = "spare";
  return "spare";
}

export function safetyNetStatus(): {
  role: SafetyRole;
  midiOutAllowed: boolean;
} {
  const role = getSafetyRole();
  return { role, midiOutAllowed: role === "master" };
}
