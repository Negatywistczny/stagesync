/**
 * Dock / strip name label with middle ellipsis (ResizeObserver + canvas measure).
 */

import { useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import {
  measurerFromElement,
  truncateMiddle,
} from "../../../lib/truncateMiddle.js";

export type MiddleTruncateLabelProps = {
  text: string;
  className?: string;
  title?: string;
  onDoubleClick?: (e: MouseEvent) => void;
};

export function MiddleTruncateLabel({
  text,
  className,
  title,
  onDoubleClick,
}: MiddleTruncateLabelProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(text);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const width = el.clientWidth;
      if (!(width > 0)) {
        setDisplay(text);
        return;
      }
      const measure = measurerFromElement(el);
      setDisplay(truncateMiddle(text, width, measure));
    };

    update();
    const ro = new ResizeObserver(() => {
      update();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  return (
    <span
      ref={ref}
      className={className}
      title={title ?? text}
      onDoubleClick={onDoubleClick}
    >
      {display}
    </span>
  );
}
