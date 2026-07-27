/** sessionStorage flag: operator reached Admin/Timeline (or Console SPA). */

export const OPERATOR_SESSION_KEY = "stagesync.operatorSession";

export function markOperatorSession(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(OPERATOR_SESSION_KEY, "1");
  } catch {
    /* private mode / quota */
  }
}

export function hasOperatorSession(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(OPERATOR_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearOperatorSession(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(OPERATOR_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
