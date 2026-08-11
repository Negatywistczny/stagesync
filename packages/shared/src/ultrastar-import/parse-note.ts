/**
 * UltraStar / USDX import — header / note line parsing helpers.
 */

import type { TekstBlockRole } from "../schema.js";
import type { NoteKind, RawNote } from "./types.js";

export const NOTE_KIND: Record<string, NoteKind> = {
  ":": "regular",
  "*": "golden",
  R: "rap",
  G: "goldenRap",
  F: "freestyle",
};

export function parseHeaderValue(
  line: string,
): { key: string; value: string } | null {
  const trimmed = line.trim();
  // `#P1` / `#P2` (no colon) — duet player switch
  const playerOnly = /^#(P[12])$/i.exec(trimmed);
  if (playerOnly) {
    return { key: (playerOnly[1] ?? "").toUpperCase(), value: "" };
  }
  const m = /^#([A-Za-z0-9]+):(.*)$/.exec(trimmed);
  if (!m) return null;
  return { key: (m[1] ?? "").toUpperCase(), value: (m[2] ?? "").trim() };
}

export function playerToRole(
  player: number | null,
): TekstBlockRole | undefined {
  if (player === 1) return "vocal_1";
  if (player === 2) return "vocal_2";
  return undefined;
}

/**
 * Parse a note line. Lyric is everything after pitch — **trailing spaces kept**.
 * Input should be trimStart'd but not trimEnd'd.
 */
export function parseUltrastarNoteLine(
  line: string,
): Omit<RawNote, "role"> | null {
  const src = line.trimStart();
  if (!src) return null;
  const kind = NOTE_KIND[src[0] ?? ""];
  if (!kind) return null;

  // kind + start + length + pitch + optional lyric (greedy remainder, spaces kept)
  const m = /^([:*RGF])\s+(\S+)\s+(\S+)\s+(\S+)(?: (.*))?$/.exec(src);
  if (!m) return null;

  const startBeat = Number((m[2] ?? "").replace(",", "."));
  const lengthBeat = Number((m[3] ?? "").replace(",", "."));
  const pitch = Number((m[4] ?? "").replace(",", "."));
  const text = m[5] ?? "";
  if (
    !Number.isFinite(startBeat) ||
    !Number.isFinite(lengthBeat) ||
    lengthBeat <= 0 ||
    !Number.isFinite(pitch)
  ) {
    return null;
  }
  return { kind, startBeat, lengthBeat, pitch, text };
}
