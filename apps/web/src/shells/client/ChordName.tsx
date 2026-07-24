import type { ChordNameParts } from "@stagesync/shared";
import type { ReactNode } from "react";

export type ChordBassLayout = "inline" | "stack";

export type ChordNameClassNames = {
  top: string;
  root: string;
  sup: string;
  bass: string;
  stack: string;
};

function escapeHtml(text: string): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Imperative HTML for StaticDomAnchor / hero motion (escaped text). */
export function serializeChordNameHtml(
  parts: ChordNameParts,
  classNames: ChordNameClassNames,
  bassLayout: ChordBassLayout = "inline",
): string {
  const root = `<span class="${classNames.root}">${escapeHtml(parts.root)}</span>`;
  const topInner = parts.sup
    ? `${root}<sup class="${classNames.sup}">${escapeHtml(parts.sup)}</sup>`
    : root;
  const top = `<span class="${classNames.top}">${topInner}</span>`;
  if (!parts.bass) return top;
  const bass = `<span class="${classNames.bass}">${escapeHtml(parts.bass)}</span>`;
  if (bassLayout === "stack") {
    return `<span class="${classNames.stack}">${top}${bass}</span>`;
  }
  return `${top}${bass}`;
}

export function ChordName({
  parts,
  classNames,
  bassLayout = "inline",
}: {
  parts: ChordNameParts;
  classNames: ChordNameClassNames;
  bassLayout?: ChordBassLayout;
}): ReactNode {
  const top = (
    <span className={classNames.top}>
      <span className={classNames.root}>{parts.root}</span>
      {parts.sup ? <sup className={classNames.sup}>{parts.sup}</sup> : null}
    </span>
  );
  if (!parts.bass) return top;
  const bass = <span className={classNames.bass}>{parts.bass}</span>;
  if (bassLayout === "stack") {
    return (
      <span className={classNames.stack}>
        {top}
        {bass}
      </span>
    );
  }
  return (
    <>
      {top}
      {bass}
    </>
  );
}
