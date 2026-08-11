import { localErrorActionsVisibility } from "./localErrorActions.js";

export const LABEL_LOCAL_IDLE = "Uruchom lokalny host";
export const LABEL_LOCAL_RETRY = "Ponów uruchomienie";

export function friendlyLocalError(raw) {
  const text = String(raw?.message ?? raw ?? "");
  const lower = text.toLowerCase();
  if (
    lower.includes("eaddrinuse") ||
    lower.includes("address already in use") ||
    lower.includes("port 4000 jest zajęty")
  ) {
    return (
      "Port 4000 jest zajęty (np. przez `pnpm dev`). " +
      "Zatrzymaj drugi serwer albo użyj Połącz ręcznie: http://127.0.0.1:4000 — " +
      "przekieruje do UI deweloperskiego na :3000."
    );
  }
  if (
    lower.includes("eacces") ||
    lower.includes("permission denied") ||
    lower.includes("access is denied") ||
    lower.includes("brak uprawnień")
  ) {
    return "Brak uprawnień do portu lub katalogu danych. Sprawdź uprawnienia folderu aplikacji i spróbuj ponownie.";
  }
  if (lower.includes("module_not_found") || lower.includes("nie wczytał zależności")) {
    return "Lokalny host nie wczytał zależności. Przeinstaluj StageSync z najnowszego release.";
  }
  if (lower.includes("timeout") || lower.includes("nie odpowiedział")) {
    return "Lokalny host nie odpowiedział w czasie. Spróbuj ponownie.";
  }
  if (lower.includes("zatrzymał się niespodziewanie")) {
    return text.split("\n")[0]?.trim() || text;
  }
  const first = text.split("\n\n— log")[0]?.trim() || text;
  return first.length > 280 ? `${first.slice(0, 277)}…` : first;
}

/** Extract embedded sidecar log from a Rust failure string (`— log hosta —`). */
export function extractEmbeddedLog(raw) {
  const text = String(raw?.message ?? raw ?? "");
  const marker = "\n\n— log";
  const idx = text.indexOf(marker);
  if (idx < 0) return "";
  const after = text.slice(idx + marker.length);
  const nl = after.indexOf("\n");
  return (nl >= 0 ? after.slice(nl + 1) : after).trim();
}

/** Prefer live sidecar tail; fall back to embedded log in the error payload. */
export async function resolveLocalLog(rawErr, invoke) {
  try {
    const tail = await invoke("get_sidecar_log_tail");
    if (String(tail || "").trim()) return String(tail);
  } catch {
    /* ignore */
  }
  return extractEmbeddedLog(rawErr);
}

export function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function buildLocalLogExport(message, log) {
  if (!log.trim()) return null;
  const parts = [
    "# StageSync — log startu lokalnego hosta",
    `# ${new Date().toISOString()}`,
  ];
  if (message.trim()) {
    parts.push("", "## Komunikat", message.trim());
  }
  parts.push("", "## Log hosta", log.trim());
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return {
    filename: `stagesync-host-${stamp}.log`,
    content: `${parts.join("\n")}\n`,
  };
}

export function syncLocalErrorActions(el, localHasError, lastLocalLog, busy) {
  const vis = localErrorActionsVisibility({
    hasError: localHasError,
    hasLog: Boolean(lastLocalLog.trim()),
  });
  el.btnLocalClear.hidden = !vis.showClear;
  el.btnLocalDiagnosticLog.hidden = !vis.showDiagnosticDownload;
  el.localErrorActions.hidden = !vis.showRow;
  el.btnHeaderDownloadLog.disabled = busy || !vis.headerDownloadEnabled;
}
