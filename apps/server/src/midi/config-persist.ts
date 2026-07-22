/**
 * Persist Host MIDI port selection under data/host/midi-config.json.
 * Zod on the file edge — fail fast on corrupt shapes when loading for apply.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  MidiHostConfigSchema,
  type MidiHostConfig,
} from "@stagesync/shared";

export function loadMidiHostConfigFile(filePath: string): MidiHostConfig | null {
  if (!existsSync(filePath)) return null;
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  return MidiHostConfigSchema.parse(raw);
}

export function saveMidiHostConfigFile(
  filePath: string,
  config: MidiHostConfig,
): void {
  const parsed = MidiHostConfigSchema.parse(config);
  mkdirSync(dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmpPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  renameSync(tmpPath, filePath);
}

/** Env ports override file; clockOut comes from file when present. */
export function resolveBootMidiConfig(
  fromFile: MidiHostConfig | null,
): MidiHostConfig {
  const envIn = process.env.STAGESYNC_MIDI_INPUT?.trim() || null;
  const envOut = process.env.STAGESYNC_MIDI_OUTPUT?.trim() || null;
  return {
    inputId: envIn ?? fromFile?.inputId ?? null,
    outputId: envOut ?? fromFile?.outputId ?? null,
    clockOutEnabled: fromFile?.clockOutEnabled ?? true,
  };
}
