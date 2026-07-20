/** Client display prefs (localStorage) — H zamiast B, litery, animacje. */

const KEY_HYBRID = "stagesync-chord-hybrid-polish-b";
const KEY_LITERAL = "stagesync-chord-literal-quality";
const KEY_ANIM = "stagesync-grid-animations";
const KEY_FORM_NOTES = "stagesync-client-form-notes-edit";

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
};

export function loadClientDisplayPrefs(): ClientDisplayPrefs {
  return {
    hybridPolishB: readBool(KEY_HYBRID, false),
    literalQuality: readBool(KEY_LITERAL, false),
    gridAnimations: readBool(KEY_ANIM, true),
    formNotesEdit: readBool(KEY_FORM_NOTES, false),
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
