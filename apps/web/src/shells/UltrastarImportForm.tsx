/**
 * UltraStar / USDX import: USDB search / URL fetch → preview → apply.
 * Paste / .txt file remain as offline fallback (same pattern as UG import).
 */

import { useEffect, useMemo, useState } from "react";
import { Button, Input, Textarea } from "@stagesync/ui";
import {
  importUltrastarText,
  type UltrastarImportOk,
  type UltrastarImportOptions,
  type UltrastarSearchHit,
  type UltrastarSongMetadata,
} from "@stagesync/shared";
import {
  fetchUltrastarAccount,
  fetchUltrastarFromServer,
  putUltrastarAccount,
  searchUltrastarSongs,
  testUltrastarAccount,
} from "../lib/ultrastarImportApi.js";
import { yieldToUi } from "../lib/audioTempoAnalysis.js";
import styles from "./UgImportForm.module.css";

export type UltrastarImportFormProps = {
  applyLabel: string;
  disabled?: boolean;
  applying?: boolean;
  importOptions?: UltrastarImportOptions;
  /** Prefill USDB search from project name / artist when known. */
  initialTitle?: string;
  initialArtist?: string;
  onCancel: () => void;
  onApply: (result: UltrastarImportOk) => void | Promise<void>;
};

export function UltrastarImportForm({
  applyLabel,
  disabled = false,
  applying = false,
  importOptions,
  initialTitle = "",
  initialArtist = "",
  onCancel,
  onApply,
}: UltrastarImportFormProps) {
  const [searchTitle, setSearchTitle] = useState(() => initialTitle.trim());
  const [searchArtist, setSearchArtist] = useState(() => initialArtist.trim());
  const [searchHits, setSearchHits] = useState<UltrastarSearchHit[]>([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [metadata, setMetadata] = useState<UltrastarSongMetadata | null>(null);
  const [fetchStatus, setFetchStatus] = useState<string | null>(null);

  const [text, setText] = useState("");
  /** Paste / file always available (offline fallback) — not buried behind a toggle. */
  const [showPaste, setShowPaste] = useState(true);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [busyApply, setBusyApply] = useState(false);

  const [showAccount, setShowAccount] = useState(false);
  const [accountUser, setAccountUser] = useState("");
  const [accountPass, setAccountPass] = useState("");
  const [accountConfigured, setAccountConfigured] = useState(false);
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountLoaded, setAccountLoaded] = useState(false);

  const locked =
    disabled || applying || searching || fetching || busyApply || accountBusy;

  const preview = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    return importUltrastarText(trimmed, importOptions);
  }, [text, importOptions]);

  const parseError =
    text.trim() && preview && !preview.ok ? preview.message : null;
  const error = applyError ?? parseError;

  useEffect(() => {
    let cancelled = false;
    void fetchUltrastarAccount()
      .then((status) => {
        if (cancelled) return;
        setAccountConfigured(status.configured);
        setAccountUser(status.user);
        setAccountLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setAccountLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function shouldOpenUsdbAccount(message: string): boolean {
    return /Brak konta USDB|Konto USDB|Sesja USDB|odnowić sesji USDB|zaloguj|Nieprawidłowe dane logowania|dane konta|ogranicza logowanie|nie udało się połączyć z USDB/i.test(
      message,
    );
  }

  async function onSearch() {
    setApplyError(null);
    setSearchMessage(null);
    setSearching(true);
    try {
      const data = await searchUltrastarSongs(searchTitle, searchArtist);
      setSearchHits(data.results);
      setSearchMessage(
        data.results.length
          ? null
          : data.message ?? "Brak wyników na USDB.",
      );
    } catch (err) {
      setSearchHits([]);
      const message = err instanceof Error ? err.message : String(err);
      setSearchMessage(message);
      if (shouldOpenUsdbAccount(message)) {
        setShowAccount(true);
      }
    } finally {
      setSearching(false);
    }
  }

  async function onFetchUrl(overrideUrl?: string) {
    const target = (overrideUrl ?? url).trim();
    setApplyError(null);
    setFetchStatus(null);
    if (!target) {
      setApplyError("Wklej link do utworu USDB (usdb.animux.de).");
      return;
    }
    setFetching(true);
    setFetchStatus("Pobieranie z USDB…");
    try {
      const data = await fetchUltrastarFromServer(target);
      setUrl(data.metadata.url || target);
      setMetadata(data.metadata);
      setText(data.content);
      if (data.metadata.title?.trim()) {
        setSearchTitle((prev) => prev.trim() || data.metadata.title!.trim());
      }
      if (data.metadata.artist?.trim()) {
        setSearchArtist((prev) => prev.trim() || data.metadata.artist!.trim());
      }
      setFetchStatus("Pobrano z USDB");
      // Keep paste visible so operator can inspect / tweak before apply.
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setApplyError(message);
      setFetchStatus(null);
      if (shouldOpenUsdbAccount(message)) {
        setShowAccount(true);
      }
    } finally {
      setFetching(false);
    }
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    setApplyError(null);
    setMetadata(null);
    try {
      setText(await file.text());
      setShowPaste(true);
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleApply() {
    if (!preview?.ok) return;
    setApplyError(null);
    setBusyApply(true);
    await yieldToUi();
    try {
      await onApply(preview);
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyApply(false);
    }
  }

  async function onSaveAccount() {
    setAccountStatus(null);
    setAccountBusy(true);
    try {
      const saved = await putUltrastarAccount(
        accountUser,
        accountPass.trim() ? accountPass : undefined,
      );
      setAccountConfigured(saved.configured);
      setAccountUser(saved.user);
      setAccountPass("");
      setAccountStatus(saved.message ?? "Zapisano konto USDB.");
    } catch (err) {
      setAccountStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setAccountBusy(false);
    }
  }

  async function onTestAccount() {
    setAccountStatus(null);
    setAccountBusy(true);
    try {
      const result = await testUltrastarAccount(
        accountUser.trim() || undefined,
        accountPass.trim() || undefined,
      );
      setAccountStatus(result.message);
    } catch (err) {
      setAccountStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setAccountBusy(false);
    }
  }

  async function onClearAccount() {
    setAccountStatus(null);
    setAccountBusy(true);
    try {
      const saved = await putUltrastarAccount("", "");
      setAccountConfigured(saved.configured);
      setAccountUser("");
      setAccountPass("");
      setAccountStatus(saved.message ?? "Usunięto konto USDB.");
    } catch (err) {
      setAccountStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setAccountBusy(false);
    }
  }

  const canApply = Boolean(preview?.ok) && !locked && !applying;

  return (
    <div className={styles.root}>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <p className={styles.status}>
        Szukaj na USDB, wklej link albo wklej / wybierz plik <code>.txt</code>.
        Tempo z <code>#BPM</code> to wartość ×4 (metronom = BPM/4). Import trafia
        do draftu — potem Zapisz w nagłówku (⌘S / Ctrl+S), żeby
        utrwalić na hoście. Wyszukiwanie online wymaga konta USDB
        {accountLoaded
          ? accountConfigured
            ? ` (zapisane: ${accountUser || "…"}).`
            : " — ustaw poniżej albo w Ustawieniach serwera."
          : "."}
      </p>

      <div className={styles.fetchRow}>
        <Button
          variant="ghost"
          disabled={disabled || applying}
          onClick={() => setShowAccount((v) => !v)}
        >
          {showAccount ? "Ukryj konto USDB" : "Konto USDB"}
        </Button>
      </div>

      {showAccount ? (
        <div className={styles.preview} data-testid="ultrastar-usdb-account">
          <p className={styles.previewTitle}>Konto USDB (host)</p>
          <p className={styles.status}>
            Darmowe konto na{" "}
            <a
              href="https://usdb.animux.de"
              target="_blank"
              rel="noreferrer"
            >
              usdb.animux.de
            </a>
            . Dane zapisują się na serwerze (wszyscy klienci tego hosta).
          </p>
          <label className={styles.urlBlock}>
            <span>Użytkownik</span>
            <Input
              type="text"
              autoComplete="username"
              value={accountUser}
              aria-label="Użytkownik USDB"
              disabled={locked}
              onChange={(e) => setAccountUser(e.target.value)}
            />
          </label>
          <label className={styles.urlBlock}>
            <span>Hasło</span>
            <Input
              type="password"
              autoComplete="current-password"
              value={accountPass}
              aria-label="Hasło USDB"
              placeholder={
                accountConfigured
                  ? "Zostaw puste, aby nie zmieniać"
                  : undefined
              }
              disabled={locked}
              onChange={(e) => setAccountPass(e.target.value)}
            />
          </label>
          <div className={styles.fetchRow}>
            <Button
              variant="secondary"
              disabled={locked || (!accountUser.trim() && !accountConfigured)}
              loading={accountBusy}
              onClick={() => void onSaveAccount()}
            >
              Zapisz
            </Button>
            <Button
              variant="ghost"
              disabled={
                locked ||
                (!accountConfigured &&
                  (!accountUser.trim() || !accountPass.trim()))
              }
              onClick={() => void onTestAccount()}
            >
              Testuj połączenie
            </Button>
            {accountConfigured ? (
              <Button
                variant="ghost"
                disabled={locked}
                onClick={() => void onClearAccount()}
              >
                Usuń
              </Button>
            ) : null}
          </div>
          {accountStatus ? (
            <p className={styles.status} role="status">
              {accountStatus}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={styles.searchRow}>
        <Input
          type="text"
          value={searchTitle}
          aria-label="Tytuł do wyszukiwania UltraStar"
          placeholder="Tytuł"
          disabled={locked}
          onChange={(e) => setSearchTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void onSearch();
            }
          }}
        />
        <Input
          type="text"
          value={searchArtist}
          aria-label="Artysta do wyszukiwania UltraStar"
          placeholder="Artysta (opcjonalnie)"
          disabled={locked}
          onChange={(e) => setSearchArtist(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void onSearch();
            }
          }}
        />
        <Button
          variant="secondary"
          disabled={locked || !searchTitle.trim()}
          loading={searching}
          onClick={() => void onSearch()}
        >
          Szukaj na USDB
        </Button>
      </div>
      {searchMessage ? (
        <p className={styles.status} role="status">
          {searchMessage}
        </p>
      ) : null}
      {searchHits.length > 0 ? (
        <ul
          className={styles.results}
          role="listbox"
          aria-label="Wyniki USDB UltraStar"
        >
          {searchHits.map((hit, i) => {
            const label = [hit.title, hit.artist].filter(Boolean).join(" — ");
            const disabledHit = !hit.url || locked;
            return (
              <li key={`${hit.id ?? hit.url ?? i}-${i}`}>
                <button
                  type="button"
                  className={styles.resultBtn}
                  role="option"
                  disabled={disabledHit}
                  onClick={() => {
                    if (!hit.url) return;
                    setUrl(hit.url);
                    void onFetchUrl(hit.url);
                  }}
                >
                  <span className={styles.resultTitle}>{label || hit.url}</span>
                  {hit.language || hit.edition ? (
                    <span className={styles.resultMeta}>
                      {[hit.language, hit.edition].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <label className={styles.urlBlock}>
        <span>Link USDB</span>
        <Input
          type="url"
          value={url}
          aria-label="Link USDB UltraStar"
          placeholder="https://usdb.animux.de/?link=detail&id=…"
          disabled={locked}
          onChange={(e) => {
            setUrl(e.target.value);
            setApplyError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void onFetchUrl();
            }
          }}
        />
      </label>
      <div className={styles.fetchRow}>
        <Button
          variant="secondary"
          disabled={locked || !url.trim()}
          loading={fetching}
          onClick={() => void onFetchUrl()}
        >
          Pobierz z USDB
        </Button>
        <Button
          variant="ghost"
          disabled={locked}
          onClick={() => setShowPaste((v) => !v)}
        >
          {showPaste ? "Ukryj wklejanie" : "Pokaż wklejanie / plik"}
        </Button>
      </div>
      {fetchStatus ? (
        <p className={styles.status} role="status">
          {fetchStatus}
          {metadata?.language ? ` · ${metadata.language}` : ""}
        </p>
      ) : null}

      {showPaste ? (
        <>
          <label className={styles.urlBlock}>
            Plik UltraStar
            <input
              type="file"
              accept=".txt,text/plain"
              disabled={locked}
              onChange={(e) => {
                void handleFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </label>
          <Textarea
            rows={10}
            value={text}
            aria-label="Tekst UltraStar"
            placeholder={"#TITLE:…\n#BPM:320\n#GAP:0\n: 0 4 0 Hel\n…"}
            disabled={locked}
            onChange={(e) => {
              setApplyError(null);
              setMetadata(null);
              setText(e.target.value);
            }}
          />
        </>
      ) : text ? (
        <Textarea
          rows={4}
          value={text}
          aria-label="Tekst UltraStar"
          readOnly
          disabled={locked}
        />
      ) : (
        <p className={styles.status}>
          Brak tekstu — wklej plik albo pobierz z USDB.
        </p>
      )}

      {preview?.ok ? (
        <p className={styles.status} data-testid="ultrastar-import-preview">
          {preview.title ?? "Bez tytułu"}
          {preview.artist ? ` — ${preview.artist}` : ""} ·{" "}
          {preview.syllableCount} sylab / {preview.noteCount} nut · metronom{" "}
          {preview.metronomeBpm} BPM (#BPM {preview.ultrastarBpm}) · GAP{" "}
          {preview.gapMs} ms · {preview.tekst.clips.length} linii
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button
          type="button"
          variant="ghost"
          disabled={applying || fetching || searching || busyApply || accountBusy}
          onClick={onCancel}
        >
          Anuluj
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={!canApply}
          loading={applying || busyApply}
          onClick={() => {
            void handleApply();
          }}
        >
          {applyLabel}
        </Button>
      </div>
    </div>
  );
}
