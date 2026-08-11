import { useEffect, useMemo, useState } from "react";
import { Button } from "@stagesync/ui";
import { renderSVG } from "uqr";
import {
  fetchNetworkInfo,
  pickPrimaryJoinUrl,
  apkDownloadUrlsFromJoin,
  probeApkAvailable,
} from "@lib/shell-operator/setlistApi.js";
import { QrWrap } from "../shared/index.js";
import { BridgeModal } from "./BridgeModal.js";
import styles from "../DesktopMenuBridge.module.css";

export function HostQrModal({ onClose }: { onClose: () => void }) {
  type QrMode = "join" | "performer" | "console";
  const [mode, setMode] = useState<QrMode>("join");
  const [urls, setUrls] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [performerUrl, setPerformerUrl] = useState<string | null>(null);
  const [consoleUrl, setConsoleUrl] = useState<string | null>(null);
  const [performerReady, setPerformerReady] = useState(false);
  const [consoleReady, setConsoleReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const info = await fetchNetworkInfo();
        if (cancelled) return;
        const list = info.urls.length > 0 ? info.urls : [];
        setUrls(list);
        const join = pickPrimaryJoinUrl(info) ?? list[0] ?? null;
        setSelected(join);
        const apk = join ? apkDownloadUrlsFromJoin(join) : null;
        if (apk) {
          setPerformerUrl(apk.performer);
          setConsoleUrl(apk.console);
          const [pOk, cOk] = await Promise.all([
            probeApkAvailable(apk.performer),
            probeApkAvailable(apk.console),
          ]);
          if (cancelled) return;
          setPerformerReady(pOk);
          setConsoleReady(cOk);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Nie udało się pobrać URL sieci",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeUrl =
    mode === "join"
      ? selected
      : mode === "performer"
        ? performerReady
          ? performerUrl
          : null
        : consoleReady
          ? consoleUrl
          : null;

  const qrSvg = useMemo(() => {
    if (!activeUrl) return null;
    try {
      return renderSVG(activeUrl, {
        ecc: "M",
        border: 2,
        pixelSize: 6,
      });
    } catch {
      return null;
    }
  }, [activeUrl]);

  const title =
    mode === "join"
      ? "Kod QR — dołącz do hosta"
      : mode === "performer"
        ? "Kod QR — pobierz Performer"
        : "Kod QR — pobierz Console";

  return (
    <BridgeModal title={title} onClose={onClose}>
      <div className={styles.body}>
        <div className={styles.modeRow} role="tablist" aria-label="Tryb QR">
          {(
            [
              ["join", "Dołącz"],
              ["performer", "Performer APK"],
              ["console", "Console APK"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              variant="ghost"
              role="tab"
              aria-selected={mode === id}
              selected={mode === id}
              onClick={() => setMode(id)}
            >
              {label}
            </Button>
          ))}
        </div>
        {loading ? (
          <p className={styles.muted} role="status" aria-live="polite">
            Ładowanie adresów LAN…
          </p>
        ) : null}
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        {!loading && !error && mode === "join" && urls.length === 0 ? (
          <p className={styles.muted} role="status" aria-live="polite">
            Brak adresów LAN z hosta.
          </p>
        ) : null}
        {!loading && !error && mode === "performer" && !performerReady ? (
          <p className={styles.muted} role="status">
            Host nie serwuje teraz Performer APK (
            {performerUrl ?? "/downloads/stagesync-performer.apk"}). Pobierz z
            Releases albo zbuduj APK lokalnie — patrz dokumentacja Mobile.
          </p>
        ) : null}
        {!loading && !error && mode === "console" && !consoleReady ? (
          <p className={styles.muted} role="status">
            Host nie serwuje teraz Console APK (
            {consoleUrl ?? "/downloads/stagesync-console.apk"}). Pobierz z
            Releases albo zbuduj APK lokalnie — patrz dokumentacja Mobile.
          </p>
        ) : null}
        {activeUrl && qrSvg ? (
          <QrWrap svg={qrSvg} aria-label={`Kod QR dla ${activeUrl}`} />
        ) : null}
        {mode === "join" && urls.length > 0 ? (
          <ul className={styles.urlList} aria-label="Adresy sieciowe">
            {urls.map((url) => (
              <li key={url}>
                <Button
                  variant="ghost"
                  selected={url === selected}
                  className={styles.urlPick}
                  onClick={() => setSelected(url)}
                >
                  {url}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        {mode === "join" ? (
          <p className={styles.muted}>
            Zeskanuj kod telefonem / tabletem w tej samej sieci LAN
            (dołączenie).
          </p>
        ) : (
          <p className={styles.muted}>
            QR prowadzi do pliku APK na tym hoście.
          </p>
        )}
      </div>
    </BridgeModal>
  );
}
