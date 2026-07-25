/**
 * Post-Vite: write ui-hash.json, ui-manifest.json, ui-bundle.zip and stamp sw.js cache key.
 * Standalone: `node scripts/emit-ui-meta.mjs [distDir]`
 */
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const PROTOCOL_VERSION = 1;
const META_NAMES = new Set([
  "ui-hash.json",
  "ui-manifest.json",
  "ui-bundle.zip",
]);

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultDist = join(__dirname, "..", "dist");

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function walkFiles(root, dir = root, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkFiles(root, full, out);
      continue;
    }
    const rel = relative(root, full).split(sep).join("/");
    if (META_NAMES.has(rel)) continue;
    out.push({ abs: full, rel, size: st.size });
  }
  return out;
}

function sha256Hex(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function u16(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n, 0);
  return b;
}

function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}

function buildZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const localHeader = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBuf.length),
      u16(0),
      nameBuf,
    ]);
    localParts.push(localHeader, data);
    const central = Buffer.concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBuf.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBuf,
    ]);
    centralParts.push(central);
    offset += localHeader.length + data.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);
  return Buffer.concat([...localParts, centralDir, end]);
}

function computeUiHash(assets) {
  return sha256Hex(
    Buffer.from(assets.map((a) => `${a.path}:${a.hash}`).join("\n"), "utf8"),
  );
}

export function emitUiMeta(distDir = defaultDist) {
  if (!existsSync(distDir)) {
    throw new Error(`emit-ui-meta: missing dist at ${distDir}`);
  }

  const files = walkFiles(distDir).sort((a, b) => a.rel.localeCompare(b.rel));
  const assets = [];
  const zipEntries = [];

  for (const f of files) {
    const data = readFileSync(f.abs);
    const hash = sha256Hex(data);
    assets.push({ path: `/${f.rel}`, hash, size: f.size });
    zipEntries.push({ name: f.rel, data });
  }

  let uiHash = computeUiHash(assets);

  const swPath = join(distDir, "sw.js");
  if (existsSync(swPath)) {
    let sw = readFileSync(swPath, "utf8");
    const cacheName = `stagesync-pwa-${uiHash.slice(0, 16)}`;
    sw = sw.replace(
      /const CACHE = ["'][^"']+["']/,
      `const CACHE = "${cacheName}"`,
    );
    writeFileSync(swPath, sw);
    const swData = readFileSync(swPath);
    const swHash = sha256Hex(swData);
    const idx = assets.findIndex((a) => a.path === "/sw.js");
    if (idx >= 0) {
      assets[idx] = { path: "/sw.js", hash: swHash, size: swData.length };
    }
    const zIdx = zipEntries.findIndex((e) => e.name === "sw.js");
    if (zIdx >= 0) zipEntries[zIdx] = { name: "sw.js", data: swData };
    uiHash = computeUiHash(assets);
  }

  const hashFile = { protocolVersion: PROTOCOL_VERSION, uiHash };
  const manifest = {
    protocolVersion: PROTOCOL_VERSION,
    uiHash,
    assets,
  };

  const hashJson = `${JSON.stringify(hashFile, null, 2)}\n`;
  const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;
  writeFileSync(join(distDir, "ui-hash.json"), hashJson);
  writeFileSync(join(distDir, "ui-manifest.json"), manifestJson);

  // Include meta in the zip so Android cache can read local uiHash after apply.
  zipEntries.push(
    { name: "ui-hash.json", data: Buffer.from(hashJson, "utf8") },
    { name: "ui-manifest.json", data: Buffer.from(manifestJson, "utf8") },
  );
  writeFileSync(join(distDir, "ui-bundle.zip"), buildZip(zipEntries));

  return hashFile;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dist = process.argv[2]
    ? join(process.cwd(), process.argv[2])
    : defaultDist;
  const meta = emitUiMeta(dist);
  console.log(
    `[emit-ui-meta] protocolVersion=${meta.protocolVersion} uiHash=${meta.uiHash.slice(0, 12)}…`,
  );
}
