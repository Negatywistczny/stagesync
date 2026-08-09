/**
 * TekstClip `blocks[]` maintenance for Timeline edit (formatVersion 6).
 * No syllable editor — only geometry / text sync rules from Content Model.
 */

import {
  wholeLineTekstBlock,
  withWholeLineTekstBlocks,
  type TekstBlock,
  type TekstClip,
  type TekstClipLine,
} from "@stagesync/shared";

/** Shift every block start by Δ (move clip; positions stay clip-absolute). */
export function shiftTekstBlocks(
  blocks: TekstBlock[] | undefined,
  deltaTicks: number,
): TekstBlock[] {
  if (!blocks?.length) return blocks ?? [];
  const delta = Math.trunc(deltaTicks);
  if (delta === 0) return blocks;
  return blocks.map((b) => ({ ...b, startTicks: b.startTicks + delta }));
}

/** Move clip start; apply same Δ to all blocks. */
export function moveTekstClipStart(
  clip: TekstClip,
  newStartTicks: number,
): TekstClip {
  const startTicks = Math.trunc(newStartTicks);
  const delta = startTicks - clip.startTicks;
  if (delta === 0) return clip;
  return {
    ...clip,
    startTicks,
    blocks: shiftTekstBlocks(clip.blocks, delta),
  };
}

/**
 * Blocks overlapping half-open window [start, start+length), clipped to it.
 * Drops zero-length remnants.
 */
export function tekstBlocksInWindow(
  blocks: TekstBlock[],
  startTicks: number,
  lengthTicks: number,
): TekstBlock[] {
  const ws = Math.trunc(startTicks);
  const we = ws + Math.max(1, Math.trunc(lengthTicks));
  const out: TekstBlock[] = [];
  for (const b of blocks) {
    const bs = b.startTicks;
    const be = b.startTicks + b.lengthTicks;
    if (bs >= we || be <= ws) continue;
    const start = Math.max(bs, ws);
    const end = Math.min(be, we);
    const length = end - start;
    if (length < 1) continue;
    out.push({
      ...b,
      startTicks: start,
      lengthTicks: length,
    });
  }
  return out;
}

/** Sole block mirrors clip start / length / text. */
export function syncSoleTekstBlock(
  clip: TekstClipLine & { blocks?: TekstBlock[] },
): TekstClip {
  const line: TekstClipLine = {
    id: clip.id,
    startTicks: clip.startTicks,
    lengthTicks: clip.lengthTicks,
    text: clip.text,
    ...(clip.sourceSection != null
      ? { sourceSection: clip.sourceSection }
      : {}),
  };
  const prev = clip.blocks?.[0];
  if (prev) {
    return {
      ...line,
      blocks: [
        {
          ...prev,
          startTicks: line.startTicks,
          lengthTicks: line.lengthTicks,
          text: line.text,
        },
      ],
    };
  }
  return withWholeLineTekstBlocks(line);
}

/**
 * Remap payload after Forma move / resize / split / remnant.
 * - 1 block: sync to clip geometry + text
 * - pure move (same length): Δstart on all blocks
 * - otherwise (multi-block resize / split window): inherit clipped blocks
 */
export function remapTekstClipGeometry(
  prev: TekstClip | undefined,
  next: Pick<TekstClipLine, "id" | "startTicks" | "lengthTicks" | "text"> &
    Partial<Pick<TekstClipLine, "sourceSection">>,
): TekstClip {
  const line: TekstClipLine = {
    id: next.id,
    startTicks: next.startTicks,
    lengthTicks: next.lengthTicks,
    text: next.text,
    ...(next.sourceSection != null
      ? { sourceSection: next.sourceSection }
      : prev?.sourceSection != null
        ? { sourceSection: prev.sourceSection }
        : {}),
  };

  if (!prev || prev.blocks.length === 0) {
    return withWholeLineTekstBlocks(line);
  }

  if (prev.blocks.length === 1) {
    return syncSoleTekstBlock({ ...line, blocks: prev.blocks });
  }

  const delta = line.startTicks - prev.startTicks;
  if (line.lengthTicks === prev.lengthTicks && delta !== 0) {
    return {
      ...line,
      blocks: shiftTekstBlocks(prev.blocks, delta),
    };
  }

  if (
    line.startTicks === prev.startTicks &&
    line.lengthTicks === prev.lengthTicks
  ) {
    return { ...prev, ...line, blocks: prev.blocks };
  }

  const clipped = tekstBlocksInWindow(
    prev.blocks,
    line.startTicks,
    line.lengthTicks,
  );
  if (clipped.length === 0) {
    return withWholeLineTekstBlocks(line);
  }
  return { ...line, blocks: clipped };
}

/** Join abutting tekst clips: left id/text + concatenated blocks. */
export function joinTekstClips(left: TekstClip, right: TekstClip): TekstClip {
  return {
    ...left,
    lengthTicks: left.lengthTicks + right.lengthTicks,
    blocks: [...left.blocks, ...right.blocks],
  };
}

/** New line clip with one whole-line block. */
export function newTekstClipWithBlocks(clip: TekstClipLine): TekstClip {
  return withWholeLineTekstBlocks(clip);
}

/** Ensure at least one block (defensive). */
export function ensureTekstBlocks(
  clip: TekstClipLine & { blocks?: TekstBlock[] },
): TekstClip {
  if (clip.blocks && clip.blocks.length >= 1) {
    return clip as TekstClip;
  }
  return withWholeLineTekstBlocks(clip);
}

export { wholeLineTekstBlock, withWholeLineTekstBlocks };
