/** Shell chrome icons — Lucide only (no local SVG paths). */

import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  CircleHelp,
  Crosshair,
  Eraser,
  Eye,
  Info,
  ListEnd,
  Maximize2,
  MousePointer2,
  Music2,
  Pause,
  Pencil,
  Play,
  Redo2,
  Repeat,
  RotateCcw,
  RotateCw,
  Power,
  Save,
  Scissors,
  Settings,
  Square,
  SquareCheck,
  SquareMousePointer,
  Sun,
  Undo2,
  Wand2,
  X,
} from "lucide-react";

type IconProps = { className?: string; title?: string };

const lucideDefaults: LucideProps = {
  size: 18,
  strokeWidth: 2,
  "aria-hidden": true,
  color: "currentColor",
};

function withIcon(Icon: ComponentType<LucideProps>, p: IconProps) {
  return (
    <Icon
      {...lucideDefaults}
      className={p.className}
      {...(p.title ? { "aria-label": p.title, "aria-hidden": false } : {})}
    />
  );
}

export function IconPointer(p: IconProps) {
  return withIcon(MousePointer2, p);
}

export function IconPencil(p: IconProps) {
  return withIcon(Pencil, p);
}

export function IconEraser(p: IconProps) {
  return withIcon(Eraser, p);
}

export function IconScissors(p: IconProps) {
  return withIcon(Scissors, p);
}

export function IconWand(p: IconProps) {
  return withIcon(Wand2, p);
}

export function IconSmart(p: IconProps) {
  return withIcon(SquareMousePointer, p);
}

export function IconTap(p: IconProps) {
  return withIcon(CircleDot, p);
}

export function IconUndo(p: IconProps) {
  return withIcon(Undo2, p);
}

export function IconRedo(p: IconProps) {
  return withIcon(Redo2, p);
}

export function IconHelp(p: IconProps) {
  return withIcon(CircleHelp, p);
}

export function IconChevronLeft(p: IconProps) {
  return withIcon(ChevronLeft, p);
}

export function IconChevronRight(p: IconProps) {
  return withIcon(ChevronRight, p);
}

export function IconPlay(p: IconProps) {
  return withIcon(Play, p);
}

export function IconPause(p: IconProps) {
  return withIcon(Pause, p);
}

export function IconStop(p: IconProps) {
  return withIcon(Square, p);
}

export function IconEye(p: IconProps) {
  return withIcon(Eye, p);
}

export function IconSettings(p: IconProps) {
  return withIcon(Settings, p);
}

export function IconRestart(p: IconProps) {
  return withIcon(RotateCw, p);
}

export function IconPower(p: IconProps) {
  return withIcon(Power, p);
}

export function IconSun(p: IconProps) {
  return withIcon(Sun, p);
}

export function IconInfo(p: IconProps) {
  return withIcon(Info, p);
}

export function IconAutoAdvance(p: IconProps) {
  return withIcon(ListEnd, p);
}

export function IconFullscreen(p: IconProps) {
  return withIcon(Maximize2, p);
}

export function IconLoop(p: IconProps) {
  return withIcon(Repeat, p);
}

export function IconMetronome(p: IconProps) {
  return withIcon(Music2, p);
}

export function IconFollow(p: IconProps) {
  return withIcon(Crosshair, p);
}

/** v4 `#btn-discard` — restore/discard draft (not plain X). */
export function IconDiscard(p: IconProps) {
  return withIcon(RotateCcw, p);
}

/** v4 `#btn-save` — floppy/save glyph. */
export function IconSave(p: IconProps) {
  return withIcon(Save, p);
}

export function IconClose(p: IconProps) {
  return withIcon(X, p);
}

export function IconChecked(p: IconProps) {
  return withIcon(SquareCheck, p);
}

export function IconUnchecked(p: IconProps) {
  return withIcon(Square, p);
}
