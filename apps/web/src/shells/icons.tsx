/** Shell chrome icons — Lucide only (no local SVG paths). */

import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  CircleHelp,
  Eraser,
  Eye,
  MousePointer2,
  Pause,
  Pencil,
  Play,
  Redo2,
  Scissors,
  Settings,
  Square,
  Sun,
  Undo2,
  Wand2,
  ZoomIn,
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

export function IconZoom(p: IconProps) {
  return withIcon(ZoomIn, p);
}

export function IconWand(p: IconProps) {
  return withIcon(Wand2, p);
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

export function IconSun(p: IconProps) {
  return withIcon(Sun, p);
}
