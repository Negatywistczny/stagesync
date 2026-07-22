/**
 * Canonical Forma section names — storage stays English Title Case.
 * Display may use Polish labels (Client pref).
 */

const COUNTDOWN_NAME = "Countdown";

const POLISH_TO_ENGLISH: Record<string, string> = {
  wstep: "Intro",
  wstęp: "Intro",
  zakonczenie: "Outro",
  zakończenie: "Outro",
  zwrotka: "Verse",
  refren: "Chorus",
  mostek: "Bridge",
  przedrefren: "Pre-Chorus",
};

const ENGLISH_TYPES: Record<string, string> = {
  intro: "Intro",
  verse: "Verse",
  chorus: "Chorus",
  bridge: "Bridge",
  outro: "Outro",
  refrain: "Refrain",
  hook: "Hook",
  interlude: "Interlude",
  instrumental: "Instrumental",
};

const ENGLISH_TO_POLISH: Record<string, string> = {
  intro: "Wstęp",
  verse: "Zwrotka",
  chorus: "Refren",
  bridge: "Most",
  outro: "Zakończenie",
  refrain: "Refren",
  hook: "Hook",
  interlude: "Interludium",
  instrumental: "Instrumental",
};

const INSTRUMENT_TO_POLISH: Record<string, string> = {
  piano: "fortepian",
  guitar: "gitara",
  string: "smyczki",
  strings: "smyczki",
  bass: "bas",
  sax: "saksofon",
  saxophone: "saksofon",
  violin: "skrzypce",
  drum: "perkusja",
  drums: "perkusja",
  keyboard: "keyboard",
  synth: "syntezator",
  vocal: "wokal",
};

function instrumentToPolish(raw: string): string {
  const key = String(raw || "")
    .trim()
    .toLowerCase();
  return INSTRUMENT_TO_POLISH[key] || key;
}

function collapseWhitespace(name: string): string {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ");
}

function titleCaseWords(name: string): string {
  return collapseWhitespace(name)
    .split(" ")
    .map((word) => {
      if (!word) return word;
      return word
        .split("-")
        .map((part) => {
          const lower = part.toLowerCase();
          return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join("-");
    })
    .join(" ");
}

function withOptionalNumber(base: string, num: string | undefined): string {
  return num ? `${base} ${num}` : base;
}

function matchTypeWithNumber(
  lower: string,
  typeKey: string,
  canonical: string,
): string | null {
  const re = new RegExp(
    `^${typeKey.replace(/[\s-]/g, "[\\s-]?")}(?:\\s+(\\d+))?$`,
    "i",
  );
  const m = lower.match(re);
  if (!m) return null;
  return withOptionalNumber(canonical, m[1]);
}

/** Normalize to English Title Case for storage / comparison. */
export function normalizeSectionName(raw: string): string {
  const name = collapseWhitespace(raw);
  if (!name) return "Section";

  const lower = name.toLowerCase();

  if (/^countdown$/i.test(name)) return COUNTDOWN_NAME;

  if (/^coda(?:\s+(\d+))?$/i.test(lower)) {
    const m = lower.match(/^coda(?:\s+(\d+))?$/i);
    return withOptionalNumber("Outro", m?.[1]);
  }

  const instrumentSolo = lower.match(/^(.+?)\s+solo(?:\s+(\d+))?$/i);
  if (instrumentSolo?.[1]) {
    const instrument = titleCaseWords(instrumentSolo[1].trim());
    return withOptionalNumber(`${instrument} Solo`, instrumentSolo[2]);
  }

  if (/^solo(?:\s+(\d+))?$/i.test(lower)) {
    const m = lower.match(/^solo(?:\s+(\d+))?$/i);
    return withOptionalNumber("Solo", m?.[1]);
  }

  if (/^(?:final|last)\s+chorus$/i.test(name)) return "Final Chorus";
  if (/^chorus\s+(?:final|last)$/i.test(name)) return "Final Chorus";

  const preChorus = lower.match(/^pre[\s-]?chorus(?:\s+(\d+))?$/i);
  if (preChorus) return withOptionalNumber("Pre-Chorus", preChorus[1]);

  for (const [pl, en] of Object.entries(POLISH_TO_ENGLISH)) {
    const re = new RegExp(`^${pl}(?:\\s+(\\d+))?$`, "i");
    const m = lower.match(re);
    if (m) return withOptionalNumber(en, m[1]);
  }

  for (const [typeKey, canonical] of Object.entries(ENGLISH_TYPES)) {
    const matched = matchTypeWithNumber(lower, typeKey, canonical);
    if (matched) return matched;
  }

  return titleCaseWords(name);
}

export type FormatSectionNameOptions = {
  /** Client display: Intro → Wstęp, etc. Storage unchanged. */
  polish?: boolean;
};

/** Tablet / Client labels — optional Polish (file names stay English). */
export function formatSectionNameForDisplay(
  name: string,
  options: FormatSectionNameOptions = {},
): string {
  const canonical = normalizeSectionName(name);
  if (!options.polish) return canonical;

  const lower = canonical.toLowerCase();

  if (/^countdown$/i.test(canonical)) return "Odliczanie";

  const instrumentSolo = lower.match(/^(.+?)\s+solo(?:\s+(\d+))?$/i);
  if (instrumentSolo?.[1]) {
    const instrument = instrumentToPolish(instrumentSolo[1]);
    return withOptionalNumber(`Solo (${instrument})`, instrumentSolo[2]);
  }

  if (/^solo(?:\s+(\d+))?$/i.test(lower)) {
    const m = lower.match(/^solo(?:\s+(\d+))?$/i);
    return withOptionalNumber("Solo", m?.[1]);
  }

  if (/^final chorus$/i.test(canonical)) return "Ostatni refren";

  const preChorus = lower.match(/^pre-chorus(?:\s+(\d+))?$/i);
  if (preChorus) return withOptionalNumber("Przedrefren", preChorus[1]);

  for (const [typeKey, polish] of Object.entries(ENGLISH_TO_POLISH)) {
    const matched = matchTypeWithNumber(lower, typeKey, polish);
    if (matched) return matched;
  }

  return canonical;
}

export { COUNTDOWN_NAME };
