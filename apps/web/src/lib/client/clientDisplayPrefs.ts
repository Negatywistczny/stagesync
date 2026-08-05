/** Client display prefs (localStorage) — grid + global pitch / section labels. */

import {
  clampManualInstrumentPitch,
  isInstrumentPitchMode,
  type InstrumentPitchMode,
} from "@stagesync/shared";

const KEY_HYBRID = "stagesync-chord-hybrid-polish-b";
const KEY_LITERAL = "stagesync-chord-literal-quality";
const KEY_ANIM = "stagesync-grid-animations";
const KEY_FORM_NOTES = "stagesync-client-form-notes-edit";
const KEY_SECTION_POLISH = "stagesync-section-names-polish";
const KEY_INSTRUMENT_PITCH = "stagesync-instrument-pitch";
const KEY_INSTRUMENT_PITCH_MANUAL = "stagesync-instrument-pitch-manual";

function readBool(key: string, defaultValue: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v == null) return defaultValue;
    return v === "1" || v === "true";
  } catch {
    return defaultValue;
  }
}

function writeBool(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export type ClientDisplayPrefs = {
  hybridPolishB: boolean;
  literalQuality: boolean;
  gridAnimations: boolean;
  formNotesEdit: boolean;
  /** Intro → Wstęp, etc. (display only). */
  sectionNamesPolish: boolean;
  /** Local transposing-instrument pitch. */
  instrumentPitch: InstrumentPitchMode;
  instrumentPitchManual: number;
};

export function loadClientDisplayPrefs(): ClientDisplayPrefs {
  let instrumentPitch: InstrumentPitchMode = "concert";
  let instrumentPitchManual = 0;
  try {
    const saved = localStorage.getItem(KEY_INSTRUMENT_PITCH);
    if (isInstrumentPitchMode(saved)) instrumentPitch = saved;
    instrumentPitchManual = clampManualInstrumentPitch(
      localStorage.getItem(KEY_INSTRUMENT_PITCH_MANUAL),
    );
  } catch {
    /* ignore */
  }
  return {
    hybridPolishB: readBool(KEY_HYBRID, false),
    literalQuality: readBool(KEY_LITERAL, false),
    gridAnimations: readBool(KEY_ANIM, true),
    formNotesEdit: readBool(KEY_FORM_NOTES, false),
    sectionNamesPolish: readBool(KEY_SECTION_POLISH, false),
    instrumentPitch,
    instrumentPitchManual,
  };
}

export function setHybridPolishB(value: boolean): void {
  writeBool(KEY_HYBRID, value);
}

export function setLiteralQuality(value: boolean): void {
  writeBool(KEY_LITERAL, value);
}

export function setGridAnimations(value: boolean): void {
  writeBool(KEY_ANIM, value);
}

export function setFormNotesEdit(value: boolean): void {
  writeBool(KEY_FORM_NOTES, value);
}

export function setSectionNamesPolish(value: boolean): void {
  writeBool(KEY_SECTION_POLISH, value);
}

export function setInstrumentPitch(mode: InstrumentPitchMode): void {
  try {
    localStorage.setItem(KEY_INSTRUMENT_PITCH, mode);
  } catch {
    /* ignore */
  }
}

export function setInstrumentPitchManual(semitones: number): void {
  try {
    localStorage.setItem(
      KEY_INSTRUMENT_PITCH_MANUAL,
      String(clampManualInstrumentPitch(semitones)),
    );
  } catch {
    /* ignore */
  }
}
