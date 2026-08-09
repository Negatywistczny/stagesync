#!/usr/bin/env node
/**
 * Pakuje single-file: bootstrap + NSIS + stopka SSPAY001.
 *
 * Usage:
 *   node ./scripts/pack-stagesync-setup.mjs \
 *     --bootstrap path/to/stagesync-setup.exe \
 *     --payload path/to/*-setup.exe \
 *     --out path/to/StageSync-Setup.exe
 */
import {
  copyFileSync,
  existsSync,
  openSync,
  readFileSync,
  writeSync,
  closeSync,
  mkdirSync,
  statSync,
} from "node:fs";
import { dirname } from "node:path";

const PAYLOAD_MAGIC = Buffer.from("SSPAY001", "ascii");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i < 0 || i + 1 >= process.argv.length) return null;
  return process.argv[i + 1];
}

const bootstrap = argValue("--bootstrap");
const payload = argValue("--payload");
const out = argValue("--out");

if (!bootstrap || !payload || !out) {
  console.error(
    "Usage: pack-stagesync-setup.mjs --bootstrap <exe> --payload <nsis.exe> --out <StageSync-Setup.exe>",
  );
  process.exit(1);
}
if (!existsSync(bootstrap)) {
  console.error(`[pack-setup] brak bootstrap: ${bootstrap}`);
  process.exit(1);
}
if (!existsSync(payload)) {
  console.error(`[pack-setup] brak payload: ${payload}`);
  process.exit(1);
}

mkdirSync(dirname(out), { recursive: true });
copyFileSync(bootstrap, out);
const payloadBytes = readFileSync(payload);
const fd = openSync(out, "a");
try {
  writeSync(fd, payloadBytes);
  const lenBuf = Buffer.alloc(8);
  lenBuf.writeBigUInt64LE(BigInt(payloadBytes.length));
  writeSync(fd, lenBuf);
  writeSync(fd, PAYLOAD_MAGIC);
} finally {
  closeSync(fd);
}

const mb = (statSync(out).size / (1024 * 1024)).toFixed(1);
console.log(`[pack-setup] ${out} (${mb} MB)`);
