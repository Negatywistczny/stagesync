/** Inline SVG icons for shell chrome (stroke = currentColor). */

type IconProps = { className?: string; title?: string };

const svgProps = {
  viewBox: "0 0 24 24",
  width: 18,
  height: 18,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

export function IconPointer(p: IconProps) {
  return (
    <svg {...svgProps} className={p.className}>
      <path d="M4 4l7 16 2-6 6-2Z" />
    </svg>
  );
}

export function IconPencil(p: IconProps) {
  return (
    <svg {...svgProps} className={p.className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function IconEraser(p: IconProps) {
  return (
    <svg {...svgProps} className={p.className}>
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </svg>
  );
}

export function IconScissors(p: IconProps) {
  return (
    <svg {...svgProps} className={p.className}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4 8.12 15.88" />
      <path d="M14.47 14.48 20 20" />
      <path d="M8.12 8.12 12 12" />
    </svg>
  );
}

export function IconZoom(p: IconProps) {
  return (
    <svg {...svgProps} className={p.className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
      <path d="M11 8v6M8 11h6" />
    </svg>
  );
}

export function IconWand(p: IconProps) {
  return (
    <svg {...svgProps} className={p.className}>
      <path d="m15 4-1 4-4 1 4 1 1 4 1-4 4-1-4-1Z" />
      <path d="M4 20 14 10" />
    </svg>
  );
}

export function IconTap(p: IconProps) {
  return (
    <svg {...svgProps} className={p.className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 5v2M12 17v2M5 12h2M17 12h2" />
      <path d="M7.5 7.5l1.4 1.4M15.1 15.1l1.4 1.4M7.5 16.5l1.4-1.4M15.1 8.9l1.4-1.4" />
    </svg>
  );
}

export function IconUndo(p: IconProps) {
  return (
    <svg {...svgProps} className={p.className}>
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.7 2.9L3 13" />
    </svg>
  );
}

export function IconRedo(p: IconProps) {
  return (
    <svg {...svgProps} className={p.className}>
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.7 2.9L21 13" />
    </svg>
  );
}

export function IconHelp(p: IconProps) {
  return (
    <svg {...svgProps} className={p.className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function IconChevronLeft(p: IconProps) {
  return (
    <svg {...svgProps} className={p.className}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function IconChevronRight(p: IconProps) {
  return (
    <svg {...svgProps} className={p.className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function IconPlay(p: IconProps) {
  return (
    <svg {...svgProps} className={p.className}>
      <path d="m7 4 12 8-12 8V4z" />
    </svg>
  );
}

export function IconPause(p: IconProps) {
  return (
    <svg {...svgProps} className={p.className}>
      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </svg>
  );
}

export function IconStop(p: IconProps) {
  return (
    <svg {...svgProps} className={p.className}>
      <rect x="5" y="5" width="14" height="14" rx="1" />
    </svg>
  );
}

export function IconEye(p: IconProps) {
  return (
    <svg {...svgProps} className={p.className}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconSettings(p: IconProps) {
  return (
    <svg {...svgProps} className={p.className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  );
}

export function IconSun(p: IconProps) {
  return (
    <svg {...svgProps} className={p.className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
