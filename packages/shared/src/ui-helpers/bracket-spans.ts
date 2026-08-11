/**
 * Bracket-span scanners without regex — avoids CodeQL js/polynomial-redos on
 * `\[[^\]]*\]` / `\[([^\]]+)\]` patterns over untrusted UG / ChordPro text.
 */

/** Inclusive `[…]` spans; unclosed `[` leaves the rest as plain text (no span). */
export function forEachBracketSpan(
  line: string,
  visit: (inner: string, start: number, endExclusive: number) => void,
): void {
  let i = 0;
  while (i < line.length) {
    if (line.charCodeAt(i) !== 0x5b /* [ */) {
      i += 1;
      continue;
    }
    const close = line.indexOf("]", i + 1);
    if (close < 0) return;
    visit(line.slice(i + 1, close), i, close + 1);
    i = close + 1;
  }
}

/** Remove `[…]` spans; keep surrounding text. */
export function stripBracketSpans(line: string): string {
  let out = "";
  let i = 0;
  while (i < line.length) {
    if (line.charCodeAt(i) !== 0x5b /* [ */) {
      out += line[i];
      i += 1;
      continue;
    }
    const close = line.indexOf("]", i + 1);
    if (close < 0) {
      out += line.slice(i);
      break;
    }
    i = close + 1;
  }
  return out;
}

/** Replace each `[inner]` with `inner` (drop brackets). */
export function unwrapBracketSpans(line: string): string {
  let out = "";
  let i = 0;
  while (i < line.length) {
    if (line.charCodeAt(i) !== 0x5b /* [ */) {
      out += line[i];
      i += 1;
      continue;
    }
    const close = line.indexOf("]", i + 1);
    if (close < 0) {
      out += line.slice(i);
      break;
    }
    out += line.slice(i + 1, close);
    i = close + 1;
  }
  return out;
}

/**
 * Split like `line.split(/(\[[^\]]+\])/)` — keep bracket tokens as own parts.
 */
export function splitKeepingBracketSpans(line: string): string[] {
  const parts: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line.charCodeAt(i) === 0x5b /* [ */) {
      const close = line.indexOf("]", i + 1);
      if (close < 0) {
        parts.push(line.slice(i));
        break;
      }
      parts.push(line.slice(i, close + 1));
      i = close + 1;
      continue;
    }
    const open = line.indexOf("[", i);
    if (open < 0) {
      parts.push(line.slice(i));
      break;
    }
    parts.push(line.slice(i, open));
    i = open;
  }
  return parts;
}

/** Collapse runs of ASCII whitespace to a single space (no `\s+` regex). */
export function collapseAsciiSpaces(s: string): string {
  let out = "";
  let inSpace = false;
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    const space = c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;
    if (space) {
      if (!inSpace && out.length > 0) {
        out += " ";
        inSpace = true;
      }
      continue;
    }
    out += s[i];
    inSpace = false;
  }
  if (out.endsWith(" ")) return out.slice(0, -1);
  return out;
}

/** True for `[A] / [B]` Ultimate Guitar dual-header chrome. */
export function isDualBracketSlashHeader(line: string): boolean {
  const t = line.trim();
  let i = 0;
  while (i < t.length && t.charCodeAt(i) !== 0x5b) i += 1;
  if (i >= t.length) return false;
  const close1 = t.indexOf("]", i + 1);
  if (close1 < 0) return false;
  i = close1 + 1;
  while (i < t.length && t.charCodeAt(i) === 0x20) i += 1;
  if (i >= t.length || t.charCodeAt(i) !== 0x2f /* / */) return false;
  i += 1;
  while (i < t.length && t.charCodeAt(i) === 0x20) i += 1;
  if (i >= t.length || t.charCodeAt(i) !== 0x5b) return false;
  return t.indexOf("]", i + 1) >= 0;
}
