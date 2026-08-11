const VERSION_MISMATCH_PREFIX = "VERSION_MISMATCH:";

/** @returns {{ found: string, expected: string } | null} */
export function parseVersionMismatch(raw) {
  const text = String(raw?.message ?? raw ?? "");
  const idx = text.indexOf(VERSION_MISMATCH_PREFIX);
  if (idx < 0) return null;
  const rest = text.slice(idx + VERSION_MISMATCH_PREFIX.length);
  const [found, expected] = rest.split(":");
  if (!found || !expected) return null;
  return { found, expected };
}

/** Friendly copy for connection failures (no raw OS errno dumps). */
export function friendlyConnectError(raw, url) {
  const text = String(raw?.message ?? raw ?? "");
  const lower = text.toLowerCase();
  const target = url?.trim() || "hostem";
  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("connect failed") ||
    lower.includes("connection refused") ||
    lower.includes("could not connect") ||
    lower.includes("nie można połączyć") ||
    lower.includes("network") ||
    lower.includes("unreachable") ||
    lower.includes("http ≠ 200") ||
    lower.includes("http != 200") ||
    lower.includes("odpowiada na /api/health")
  ) {
    return `Nie można nawiązać połączenia z ${target}. Sprawdź czy urządzenie jest włączone i w tej samej sieci (firewall ~3 s).`;
  }
  if (lower.includes("nieprawidłowy url") || lower.includes("brak hosta")) {
    return "Nieprawidłowy adres. Użyj formatu http://adres:port (np. http://192.168.1.10:4000).";
  }
  const firstLine = text.split("\n")[0]?.trim() || text;
  if (firstLine.length < 160 && !lower.includes("os error") && !lower.includes("errno")) {
    return firstLine;
  }
  return `Nie można nawiązać połączenia z ${target}. Sprawdź czy urządzenie jest włączone i w tej samej sieci.`;
}

export function setManualMode(el, mode) {
  el.manualIdle.hidden = mode !== "idle";
  el.manualBusy.hidden = mode !== "busy";
  el.manualError.hidden = mode !== "error";
  el.manualWarn.hidden = mode !== "warn";
}

export function showManualBusy(el, message) {
  setManualMode(el, "busy");
  el.manualBusyText.textContent = message;
}

export function showManualError(el, message, retryUrl) {
  setManualMode(el, "error");
  el.manualErrorText.textContent = message;
  if (retryUrl) el.manualUrl.value = retryUrl;
}

export function showManualVersionWarn(el, found, expected, retryUrl) {
  setManualMode(el, "warn");
  el.manualWarnText.textContent = `Wersja hosta (v${found}) różni się od aplikacji (v${expected}). Połączenie może działać niestabilnie.`;
  if (retryUrl) el.manualUrl.value = retryUrl;
}
