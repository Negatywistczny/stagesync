import { useEffect, useState } from "react";
import { MQ_LANDSCAPE_PHONE, MQ_MOBILE } from "./breakpoints.js";

/** True when viewport matches phone breakpoint (`MQ_MOBILE`, ≤768px) or landscape phone. Tablets stay false. */
export function useMqMobile(): boolean {
  const [mobile, setMobile] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return (
      window.matchMedia(MQ_MOBILE).matches ||
      window.matchMedia(MQ_LANDSCAPE_PHONE).matches
    );
  });
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mqMobile = window.matchMedia(MQ_MOBILE);
    const mqLandscape = window.matchMedia(MQ_LANDSCAPE_PHONE);

    const sync = () => setMobile(mqMobile.matches || mqLandscape.matches);
    sync();
    mqMobile.addEventListener("change", sync);
    mqLandscape.addEventListener("change", sync);
    return () => {
      mqMobile.removeEventListener("change", sync);
      mqLandscape.removeEventListener("change", sync);
    };
  }, []);
  return mobile;
}
