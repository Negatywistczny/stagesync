import { useEffect, useState } from "react";
import {
  MQ_LANDSCAPE_PHONE,
  MQ_MOBILE_COMPACT,
} from "@lib/timeline/breakpoints.js";
import { shouldUseMobileCompactChrome } from "@lib/shell-operator/operatorSurface.js";

/**
 * True when viewport matches narrow-phone chrome (`MQ_MOBILE_COMPACT`, ≤640px)
 * or landscape phone with low viewport height.
 * Same on Web, Console, and Tauri — no desktop-shell exception.
 */
export function useMqMobileCompact(): boolean {
  const [compact, setCompact] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    if (!shouldUseMobileCompactChrome()) return false;
    return (
      window.matchMedia(MQ_MOBILE_COMPACT).matches ||
      window.matchMedia(MQ_LANDSCAPE_PHONE).matches
    );
  });
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    if (!shouldUseMobileCompactChrome()) {
      setCompact(false);
      return;
    }
    const mqCompact = window.matchMedia(MQ_MOBILE_COMPACT);
    const mqLandscape = window.matchMedia(MQ_LANDSCAPE_PHONE);

    const sync = () => setCompact(mqCompact.matches || mqLandscape.matches);
    sync();
    mqCompact.addEventListener("change", sync);
    mqLandscape.addEventListener("change", sync);
    return () => {
      mqCompact.removeEventListener("change", sync);
      mqLandscape.removeEventListener("change", sync);
    };
  }, []);
  return compact;
}
