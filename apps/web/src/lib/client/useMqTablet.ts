import { useEffect, useState } from "react";
import { MQ_TABLET } from "@lib/timeline/breakpoints.js";

/** True when viewport is tablet width or narrower (`MQ_TABLET`, ≤1024px). */
export function useMqTablet(): boolean {
  const [tablet, setTablet] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(MQ_TABLET).matches;
  });
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(MQ_TABLET);
    const sync = () => setTablet(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return tablet;
}
