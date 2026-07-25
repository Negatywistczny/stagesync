/**
 * Minimal ZIP — STORE writer (#351); STORE + DEFLATE reader for restore archives.
 */

import { inflateRawSync } from "node:zlib";

export type ZipEntry = {
  name: string;
  data: Buffer;
};

/** IEEE CRC-32 (ZIP) — pure JS for Node 20 (no zlib.crc32). */
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

export function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n & 0xffff, 0);
  return b;
}

function u32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}

function dosDateTime(d = new Date()): { time: number; date: number } {
  const year = Math.max(1980, d.getFullYear());
  const time =
    (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date =
    ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

/** Build an uncompressed ZIP archive from named buffers. */
export function buildStoreZip(entries: ZipEntry[]): Buffer {
  const { time, date } = dosDateTime();
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name.replace(/\\/g, "/"), "utf8");
    const data = entry.data;
    const crc = crc32(data);
    const local = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      u16(20),
      u16(0),
      u16(0),
      u16(time),
      u16(date),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBuf.length),
      u16(0),
      nameBuf,
      data,
    ]);
    localParts.push(local);

    const central = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x01, 0x02]),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(time),
      u16(date),
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
    offset += local.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const end = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x05, 0x06]),
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

const SIG_EOCD = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;

/** Max entries / uncompressed bytes accepted when parsing a restore ZIP. */
export const ZIP_PARSE_MAX_ENTRIES = 256;
export const ZIP_PARSE_MAX_UNCOMPRESSED = 512 * 1024 * 1024;

function findEocdOffset(buf: Buffer): number {
  // EOCD is at least 22 bytes; comment ≤ 65535 → scan from end.
  const min = Math.max(0, buf.length - 22 - 65535);
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === SIG_EOCD) return i;
  }
  throw new Error("Nieprawidłowe archiwum ZIP (brak EOCD)");
}

/**
 * Parse a ZIP (STORE or DEFLATE). Skips directory markers; rejects traversal /
 * absolute paths and unsupported compression. Used by backup restore.
 */
export function parseZipArchive(buf: Buffer): ZipEntry[] {
  if (buf.length < 22) {
    throw new Error("Nieprawidłowe archiwum ZIP (za krótkie)");
  }
  const eocd = findEocdOffset(buf);
  const totalEntries = buf.readUInt16LE(eocd + 10);
  const centralSize = buf.readUInt32LE(eocd + 12);
  const centralOffset = buf.readUInt32LE(eocd + 16);
  if (totalEntries > ZIP_PARSE_MAX_ENTRIES) {
    throw new Error(
      `Archiwum ZIP ma zbyt wiele wpisów (max ${ZIP_PARSE_MAX_ENTRIES})`,
    );
  }
  if (
    centralOffset + centralSize > buf.length ||
    centralOffset + centralSize > eocd
  ) {
    throw new Error("Nieprawidłowe archiwum ZIP (central directory)");
  }

  const entries: ZipEntry[] = [];
  let offset = centralOffset;
  let uncompressedTotal = 0;

  for (let i = 0; i < totalEntries; i++) {
    if (offset + 46 > buf.length || buf.readUInt32LE(offset) !== SIG_CENTRAL) {
      throw new Error("Nieprawidłowe archiwum ZIP (central entry)");
    }
    const method = buf.readUInt16LE(offset + 10);
    const compSize = buf.readUInt32LE(offset + 20);
    const uncompSize = buf.readUInt32LE(offset + 24);
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const localHeaderOffset = buf.readUInt32LE(offset + 42);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLen;
    if (nameEnd > buf.length) {
      throw new Error("Nieprawidłowe archiwum ZIP (nazwa)");
    }
    const rawName = buf.subarray(nameStart, nameEnd).toString("utf8");
    offset = nameEnd + extraLen + commentLen;

    const name = rawName.replace(/\\/g, "/");
    if (!name || name.endsWith("/")) continue; // directory
    if (
      name.startsWith("/") ||
      name.includes("..") ||
      /^[A-Za-z]:\//.test(name)
    ) {
      throw new Error(`Niedozwolona ścieżka w ZIP: ${name}`);
    }
    if (name.startsWith("__MACOSX/") || /(^|\/)\.DS_Store$/i.test(name)) {
      continue;
    }
    if (method !== 0 && method !== 8) {
      throw new Error(
        `Nieobsługiwana kompresja ZIP (${method}) dla „${name}” — użyj STORE lub DEFLATE`,
      );
    }

    uncompressedTotal += uncompSize;
    if (uncompressedTotal > ZIP_PARSE_MAX_UNCOMPRESSED) {
      throw new Error("Archiwum ZIP przekracza limit rozpakowanych danych");
    }

    if (
      localHeaderOffset + 30 > buf.length ||
      buf.readUInt32LE(localHeaderOffset) !== SIG_LOCAL
    ) {
      throw new Error(`Nieprawidłowy local header ZIP: ${name}`);
    }
    const localNameLen = buf.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const dataEnd = dataStart + compSize;
    if (dataEnd > buf.length) {
      throw new Error(`Obcięte dane ZIP: ${name}`);
    }
    const compressed = buf.subarray(dataStart, dataEnd);
    let data: Buffer;
    if (method === 0) {
      data = Buffer.from(compressed);
    } else {
      try {
        data = inflateRawSync(compressed, { maxOutputLength: uncompSize || undefined });
      } catch {
        throw new Error(`Nie udało się rozpakować „${name}”`);
      }
    }
    if (uncompSize > 0 && data.length !== uncompSize) {
      throw new Error(`Niezgodny rozmiar po rozpakowaniu: ${name}`);
    }
    entries.push({ name, data });
  }

  return entries;
}
