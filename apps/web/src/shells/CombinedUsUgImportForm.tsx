/**
 * Combined UltraStar + UG import wizard (Text-Anchor Bridging).
 * Step 1: UltraStar timing/lyrics · Step 2: UG Forma/chords · Preview → draft.
 */

import { useMemo, useState } from "react";
import { Button, Input, Textarea } from "@stagesync/ui";
import {
  TEXT_ANCHOR_WEAK_ALIGN,
  bridgeUsUgFromTexts,
  importUltrastarText,
  importUgText,
  suggestGridBpmFromUsUgTexts,
  type TextAnchorBridgeOk,
  type TextAnchorBridgeOptions,
} from "@stagesync/shared";
import {
  fetchUltrastarFromServer,
  searchUltrastarSongs,
} from "../lib/ultrastarImportApi.js";
import { fetchUgTabFromServer, searchUgTabs } from "../lib/ugImportApi.js";
import styles from "./UgImportForm.module.css";

export type CombinedUsUgImportFormProps = {
  applyLabel: string;
  disabled?: boolean;
  applying?: boolean;
  importOptions?: TextAnchorBridgeOptions;
  /** Prefill search fields from project (and carry US → UG). */
  initialTitle?: string;
  initialArtist?: string;
  onCancel: () => void;
  onApply: (result: TextAnchorBridgeOk) => void | Promise<void>;
};

type Step = "us" | "ug" | "preview";

function parseGridBpmInput(raw: string): number | undefined {
  const n = Number.parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

export function CombinedUsUgImportForm({
  applyLabel,
  disabled = false,
  applying = false,
  importOptions,
  initialTitle = "",
  initialArtist = "",
  onCancel,
  onApply,
}: CombinedUsUgImportFormProps) {
  const seedTitle = initialTitle.trim();
  const seedArtist = initialArtist.trim();
  const [step, setStep] = useState<Step>("us");
  const [usText, setUsText] = useState("");
  const [ugText, setUgText] = useState("");

  const [usTitle, setUsTitle] = useState(seedTitle);
  const [usArtist, setUsArtist] = useState(seedArtist);
  const [ugTitle, setUgTitle] = useState(seedTitle);
  const [ugArtist, setUgArtist] = useState(seedArtist);
  /** null = follow auto suggestion when available */
  const [gridBpmDraft, setGridBpmDraft] = useState<string | null>(null);
  const [busyNet, setBusyNet] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [busyApply, setBusyApply] = useState(false);
  const [confirmWeak, setConfirmWeak] = useState(false);

  const locked = disabled || applying || busyNet || busyApply;

  const usPreview = useMemo(() => {
    if (!usText.trim()) return null;
    return importUltrastarText(usText, {
      ppq: importOptions?.ppq,
      meter: importOptions?.meter,
      contentFloorTicks: importOptions?.contentFloorTicks,
      idPrefix: "us",
    });
  }, [usText, importOptions]);

  const ugPreview = useMemo(() => {
    if (!ugText.trim()) return null;
    return importUgText(ugText, {
      ppq: importOptions?.ppq,
      meter: importOptions?.meter,
      contentFloorTicks: importOptions?.contentFloorTicks,
      idPrefix: "ug",
    });
  }, [ugText, importOptions]);

  const suggestedGridBpm = useMemo(() => {
    if (!usText.trim() || !ugText.trim()) return null;
    return suggestGridBpmFromUsUgTexts(usText, ugText, {
      meter: importOptions?.meter,
    });
  }, [usText, ugText, importOptions]);

  const fileMetroBpm =
    usPreview?.ok === true ? usPreview.ultrastarMetronomeBpm : null;

  // Default = file metro (one clock with MP3). Suggested grid is opt-in.
  const gridBpmDisplay =
    gridBpmDraft ??
    (fileMetroBpm != null
      ? String(Math.round(fileMetroBpm * 100) / 100)
      : "");
  const gridBpmForBridge = parseGridBpmInput(gridBpmDisplay);
  const usingSuggested =
    suggestedGridBpm != null &&
    gridBpmForBridge != null &&
    Math.abs(gridBpmForBridge - suggestedGridBpm) < 0.05;
  const usingFileMetro =
    fileMetroBpm != null &&
    gridBpmForBridge != null &&
    Math.abs(gridBpmForBridge - fileMetroBpm) < 0.05;

  const bridged = useMemo(() => {
    if (!usText.trim() || !ugText.trim()) return null;
    // Omit gridBpm when display equals file metro → bridge uses file default.
    const passGrid =
      gridBpmForBridge != null &&
      !(
        fileMetroBpm != null &&
        Math.abs(gridBpmForBridge - fileMetroBpm) < 0.05
      );
    return bridgeUsUgFromTexts(usText, ugText, {
      ...importOptions,
      idPrefix: "bridge",
      ...(passGrid ? { gridBpm: gridBpmForBridge } : {}),
    });
  }, [usText, ugText, importOptions, gridBpmForBridge, fileMetroBpm]);

  const error =
    applyError ??
    (usText.trim() && usPreview && !usPreview.ok ? usPreview.message : null) ??
    (ugText.trim() && ugPreview && !ugPreview.ok ? ugPreview.message : null) ??
    (bridged && !bridged.ok ? bridged.message : null);

  const bridgeOk = bridged?.ok === true ? bridged : null;
  const weakAlign =
    bridgeOk != null && bridgeOk.alignScore < TEXT_ANCHOR_WEAK_ALIGN;

  async function searchUs() {
    setStatus(null);
    setBusyNet(true);
    try {
      const data = await searchUltrastarSongs(usTitle, usArtist);
      if (!data.results.length) {
        setStatus(data.message ?? "Brak wyników USDB.");
        return;
      }
      const hit = data.results[0]!;
      if (!hit.url) {
        setStatus("Wynik USDB bez URL.");
        return;
      }
      const fetched = await fetchUltrastarFromServer(hit.url);
      setUsText(fetched.content);
      setGridBpmDraft(null);
      const metaTitle =
        fetched.metadata.title?.trim() || hit.title?.trim() || "";
      const metaArtist = fetched.metadata.artist?.trim() || "";
      if (metaTitle) setUsTitle((prev) => prev.trim() || metaTitle);
      if (metaArtist) setUsArtist((prev) => prev.trim() || metaArtist);
      setStatus(
        `UltraStar: ${metaTitle || "utwór"} — ${data.results.length} wyników (wzięto pierwszy; doprecyzuj wyszukiwanie).`,
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyNet(false);
    }
  }

  async function searchUg() {
    setStatus(null);
    setBusyNet(true);
    try {
      const data = await searchUgTabs(ugTitle, ugArtist);
      if (!data.results.length) {
        setStatus(data.message ?? "Brak wyników Ultimate Guitar.");
        return;
      }
      const hit = data.results[0]!;
      if (!hit.url) {
        setStatus("Wynik UG bez URL.");
        return;
      }
      const fetched = await fetchUgTabFromServer(hit.url);
      setUgText(fetched.content);
      setGridBpmDraft(null);
      const metaTitle =
        fetched.metadata?.title?.trim() || hit.title?.trim() || "";
      const metaArtist = fetched.metadata?.artist?.trim() || "";
      if (metaTitle) setUgTitle((prev) => prev.trim() || metaTitle);
      if (metaArtist) setUgArtist((prev) => prev.trim() || metaArtist);
      setStatus(
        `UG: ${metaTitle || "zakładka"} — ${data.results.length} wyników (wzięto pierwszy).`,
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyNet(false);
    }
  }

  async function apply() {
    if (!bridgeOk) return;
    if (weakAlign && !confirmWeak) {
      setApplyError(
        "Słabe dopasowanie tekstu — zaznacz potwierdzenie albo popraw źródła.",
      );
      return;
    }
    setApplyError(null);
    setBusyApply(true);
    try {
      await onApply(bridgeOk);
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyApply(false);
    }
  }

  return (
    <div className={styles.root}>
      <p className={styles.status} role="status">
        Import łączony (eksperymentalny): UltraStar = czas i tekst · UG = Forma
        i akordy. Wyrównanie do MP3 jest przybliżone — Smart Tempo z audio w
        kolejnym patchu. Krok:{" "}
        {step === "us"
          ? "1/3 UltraStar"
          : step === "ug"
            ? "2/3 UG"
            : "3/3 Podgląd"}
      </p>

      {step === "us" ? (
        <>
          <div className={styles.searchRow}>
            <Input
              type="text"
              value={usTitle}
              aria-label="Tytuł USDB"
              placeholder="Tytuł"
              disabled={locked}
              onChange={(e) => setUsTitle(e.target.value)}
            />
            <Input
              type="text"
              value={usArtist}
              aria-label="Artysta USDB"
              placeholder="Artysta"
              disabled={locked}
              onChange={(e) => setUsArtist(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={locked || !usTitle.trim()}
              loading={busyNet}
              onClick={() => void searchUs()}
            >
              Szukaj USDB
            </Button>
          </div>
          <Textarea
            value={usText}
            aria-label="Tekst UltraStar"
            placeholder="Wklej UltraStar .txt…"
            disabled={locked}
            rows={10}
            onChange={(e) => {
              setUsText(e.target.value);
              setGridBpmDraft(null);
            }}
          />
          {usPreview?.ok ? (
            <p className={styles.status}>
              OK: {usPreview.syllableCount} sylab · {usPreview.tekst.clips.length}{" "}
              linii · metronom pliku{" "}
              {usPreview.ultrastarMetronomeBpm.toFixed(1)} BPM
            </p>
          ) : null}
          <div className={styles.actions}>
            <Button type="button" variant="ghost" disabled={locked} onClick={onCancel}>
              Anuluj
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={locked || !usPreview?.ok}
              onClick={() => {
                setApplyError(null);
                // Carry US search / file meta into UG so operator does not retype.
                const fromUsTitle =
                  usTitle.trim() ||
                  (usPreview.ok ? usPreview.title?.trim() : "") ||
                  "";
                const fromUsArtist =
                  usArtist.trim() ||
                  (usPreview.ok ? usPreview.artist?.trim() : "") ||
                  "";
                if (fromUsTitle) {
                  setUgTitle((prev) => prev.trim() || fromUsTitle);
                }
                if (fromUsArtist) {
                  setUgArtist((prev) => prev.trim() || fromUsArtist);
                }
                setStep("ug");
              }}
            >
              Dalej — UG
            </Button>
          </div>
        </>
      ) : null}

      {step === "ug" ? (
        <>
          <div className={styles.searchRow}>
            <Input
              type="text"
              value={ugTitle}
              aria-label="Tytuł UG"
              placeholder="Tytuł"
              disabled={locked}
              onChange={(e) => setUgTitle(e.target.value)}
            />
            <Input
              type="text"
              value={ugArtist}
              aria-label="Artysta UG"
              placeholder="Artysta"
              disabled={locked}
              onChange={(e) => setUgArtist(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={locked || !ugTitle.trim()}
              loading={busyNet}
              onClick={() => void searchUg()}
            >
              Szukaj UG
            </Button>
          </div>
          <Textarea
            value={ugText}
            aria-label="Tekst Ultimate Guitar"
            placeholder="Wklej ChordPro / UG…"
            disabled={locked}
            rows={10}
            onChange={(e) => {
              setUgText(e.target.value);
              setGridBpmDraft(null);
            }}
          />
          {ugPreview?.ok ? (
            <p className={styles.status}>
              OK: {ugPreview.sections.length} sekcji Formy ·{" "}
              {ugPreview.akordy.clips.length} akordów (siatka — mostek użyje
              ticków US)
            </p>
          ) : null}
          <div className={styles.actions}>
            <Button
              type="button"
              variant="ghost"
              disabled={locked}
              onClick={() => setStep("us")}
            >
              Wstecz
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={locked || !ugPreview?.ok || !usPreview?.ok}
              onClick={() => {
                setApplyError(null);
                setConfirmWeak(false);
                setStep("preview");
              }}
            >
              Podgląd mostka
            </Button>
          </div>
        </>
      ) : null}

      {step === "preview" ? (
        <>
          {bridgeOk ? (
            <div className={styles.preview}>
              <p className={styles.status}>
                Dopasowanie słów: {Math.round(bridgeOk.alignScore * 100)}% (
                {bridgeOk.matchedWords}/
                {Math.max(bridgeOk.ugWordCount, bridgeOk.usWordCount)})
                {bridgeOk.approximate ? " · przybliżone" : ""}
              </p>
              <label className={styles.status}>
                Tempo projektu (jeden zegar z MP3)
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={40}
                  max={300}
                  value={gridBpmDisplay}
                  aria-label="Tempo siatki (sugerowane)"
                  disabled={locked}
                  onChange={(e) => setGridBpmDraft(e.target.value)}
                />
              </label>
              {suggestedGridBpm != null && !usingSuggested ? (
                <div className={styles.actions}>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={locked}
                    onClick={() => setGridBpmDraft(String(suggestedGridBpm))}
                  >
                    Siatka edycyjna ({suggestedGridBpm})
                  </Button>
                </div>
              ) : null}
              {usingSuggested ? (
                <p className={styles.status}>
                  Siatka edycyjna: tekst nadal idzie po zegarze UltraStar/MP3;
                  Forma i akordy (snap do Beat 1/3 po akcencie harmonicznym)
                  liczone z tych samych ticków. Wróć do tempa z pliku, jeśli
                  wolisz czystą siatkę zsynchronizowaną z MP3.
                </p>
              ) : (
                <p className={styles.status}>
                  Tempo z pliku UltraStar — czysta siatka taktów zsynchronizowana
                  z MP3; akordy kotwiczone na akcencie harmonicznym frazy (nie
                  na przedtakcie). Siatka edycyjna (
                  {suggestedGridBpm ?? "—"}) tylko gdy świadomie zmieniasz BPM
                  projektu.
                </p>
              )}
              {!usingFileMetro && !usingSuggested && fileMetroBpm != null ? (
                <div className={styles.actions}>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={locked}
                    onClick={() =>
                      setGridBpmDraft(
                        String(Math.round(fileMetroBpm * 100) / 100),
                      )
                    }
                  >
                    Przywróć tempo z pliku (
                    {Math.round(fileMetroBpm * 100) / 100})
                  </Button>
                </div>
              ) : null}
              <ul className={styles.sectionList}>
                {bridgeOk.sections.map((s) => (
                  <li key={`${s.name}-${s.startTicks}`}>
                    <strong>{s.name}</strong>
                    {" — "}
                    {s.chordCount} akordów
                    {s.anchored ? "" : " (Default Grid)"}
                  </li>
                ))}
              </ul>
              {bridgeOk.warnings.length > 0 ? (
                <ul className={styles.warnList}>
                  {bridgeOk.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              ) : null}
              {weakAlign ? (
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={confirmWeak}
                    disabled={locked}
                    onChange={(e) => setConfirmWeak(e.target.checked)}
                  />
                  Potwierdzam import mimo słabego dopasowania tekstu
                </label>
              ) : null}
            </div>
          ) : null}
          <div className={styles.actions}>
            <Button
              type="button"
              variant="ghost"
              disabled={locked}
              onClick={() => setStep("ug")}
            >
              Wstecz
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={locked || !bridgeOk || (weakAlign && !confirmWeak)}
              loading={busyApply}
              onClick={() => void apply()}
            >
              {applyLabel}
            </Button>
          </div>
        </>
      ) : null}

      {status ? (
        <p className={styles.status} role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
