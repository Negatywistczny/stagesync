/** Session-scoped Host Operator PIN for destructive Admin REST. */

export const OPERATOR_PIN_STORAGE_KEY = "stagesync.operatorPin";
export const OPERATOR_PIN_HEADER = "X-Stagesync-Operator-Pin";

export function getStoredOperatorPin(): string | null {
  try {
    const pin = sessionStorage.getItem(OPERATOR_PIN_STORAGE_KEY)?.trim() ?? "";
    return pin.length > 0 ? pin : null;
  } catch {
    return null;
  }
}

export function setStoredOperatorPin(pin: string): void {
  const trimmed = pin.trim();
  if (!trimmed) {
    clearStoredOperatorPin();
    return;
  }
  sessionStorage.setItem(OPERATOR_PIN_STORAGE_KEY, trimmed);
}

export function clearStoredOperatorPin(): void {
  try {
    sessionStorage.removeItem(OPERATOR_PIN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Headers to attach on mutating Admin REST calls when unlocked. */
export function operatorPinHeaders(): Record<string, string> {
  const pin = getStoredOperatorPin();
  return pin ? { [OPERATOR_PIN_HEADER]: pin } : {};
}

export function mergeApiHeaders(base?: HeadersInit): Record<string, string> {
  const out: Record<string, string> = { ...operatorPinHeaders() };
  if (!base) return out;
  if (base instanceof Headers) {
    base.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(base)) {
    for (const [key, value] of base) out[key] = value;
    return out;
  }
  return { ...out, ...base };
}

export type OperatorAuthStatus = { required: boolean };

export async function fetchOperatorPinRequired(): Promise<boolean> {
  const res = await fetch("/api/system/operator-auth", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const body = (await res.json()) as OperatorAuthStatus;
  return body.required === true;
}

/** Verifies PIN with the host and stores it in sessionStorage on success. */
export async function unlockOperatorPin(pin: string): Promise<void> {
  const trimmed = pin.trim();
  const res = await fetch("/api/system/operator-auth", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pin: trimmed }),
  });
  if (!res.ok) {
    let message = "Nieprawidłowy PIN operatora.";
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  setStoredOperatorPin(trimmed);
}
