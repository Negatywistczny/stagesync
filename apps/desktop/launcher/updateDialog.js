/**
 * Pure helpers for Launcher Update Dialog (no DOM / Tauri).
 */

/**
 * @param {{ available?: boolean, version?: string | null, current?: string, notes?: string | null }} info
 * @param {string | null | undefined} ignoredVersion
 * @param {{ force?: boolean }} [opts]
 * @returns {boolean}
 */
export function shouldShowUpdateDialog(info, ignoredVersion, opts = {}) {
  if (!info?.available || !info.version) return false;
  if (opts.force) return true;
  const ignored = String(ignoredVersion ?? "").trim();
  if (ignored && ignored === String(info.version).trim()) return false;
  return true;
}

/**
 * Turn release notes markdown / plain text into short bullet lines.
 * @param {string | null | undefined} notes
 * @param {number} [maxItems=8]
 * @returns {string[]}
 */
export function formatReleaseNotes(notes, maxItems = 8) {
  const raw = String(notes ?? "").trim();
  if (!raw) return [];
  const bullets = [];
  for (const original of raw.split(/\r?\n/)) {
    const trimmed = original.trim();
    if (!trimmed) continue;
    if (/^---+$/.test(trimmed)) break;
    if (/^#+\s/.test(trimmed)) continue;
    if (/^>\s*/.test(trimmed) && !/^>\s*[-*]/.test(trimmed)) continue;
    let line = trimmed
      .replace(/^[-*•]\s+/, "")
      .replace(/^\d+\.\s+/, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .trim();
    if (!line) continue;
    if (
      /^(Highlights|Pobierz|Zmiany|Added|Changed|Fixed|Dodano|Zmieniono|Naprawiono)\b/i.test(
        line,
      )
    ) {
      continue;
    }
    bullets.push(line);
    if (bullets.length >= maxItems) break;
  }
  return bullets;
}
