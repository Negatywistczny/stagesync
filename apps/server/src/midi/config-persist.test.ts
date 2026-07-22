import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  loadMidiHostConfigFile,
  resolveBootMidiConfig,
  saveMidiHostConfigFile,
} from "./config-persist.js";

describe("midi config persist", () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it("round-trips Zod config to disk", async () => {
    dir = await mkdtemp(join(tmpdir(), "ss-midi-"));
    const file = join(dir, "midi-config.json");
    const config = {
      inputId: "in-1",
      outputId: "out-1",
      clockOutEnabled: false,
    };
    saveMidiHostConfigFile(file, config);
    expect(loadMidiHostConfigFile(file)).toEqual(config);
    const raw = await readFile(file, "utf8");
    expect(JSON.parse(raw)).toEqual(config);
  });

  it("fail-fast on corrupt file", async () => {
    dir = await mkdtemp(join(tmpdir(), "ss-midi-"));
    const file = join(dir, "midi-config.json");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(file, '{"inputId":1}\n', "utf8");
    expect(() => loadMidiHostConfigFile(file)).toThrow();
  });

  it("resolveBootMidiConfig prefers env over file", () => {
    const prevIn = process.env.STAGESYNC_MIDI_INPUT;
    const prevOut = process.env.STAGESYNC_MIDI_OUTPUT;
    process.env.STAGESYNC_MIDI_INPUT = "env-in";
    delete process.env.STAGESYNC_MIDI_OUTPUT;
    try {
      expect(
        resolveBootMidiConfig({
          inputId: "file-in",
          outputId: "file-out",
          clockOutEnabled: false,
        }),
      ).toEqual({
        inputId: "env-in",
        outputId: "file-out",
        clockOutEnabled: false,
      });
    } finally {
      if (prevIn === undefined) delete process.env.STAGESYNC_MIDI_INPUT;
      else process.env.STAGESYNC_MIDI_INPUT = prevIn;
      if (prevOut === undefined) delete process.env.STAGESYNC_MIDI_OUTPUT;
      else process.env.STAGESYNC_MIDI_OUTPUT = prevOut;
    }
  });
});
