import { useTransport } from "./useTransport.js";
import styles from "./TransportErrorBanner.module.css";

/** Surfaces TransportProvider.error so shells are not silently broken. */
export function TransportErrorBanner() {
  const { error } = useTransport();
  if (!error) return null;
  return (
    <div className={styles.banner} role="alert">
      Transport: {error}
    </div>
  );
}
