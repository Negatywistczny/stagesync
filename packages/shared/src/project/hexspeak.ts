/**
 * Canonical Hexspeak markers & magic numbers used across StageSync
 * for debugging, test fixtures, memory canary values, and protocol frames.
 *
 * Hexspeak uses hexadecimal digits 0-9 and A-F to form readable words.
 * Common in systems programming, reverse engineering, and protocol designs.
 */
export const HEXSPEAK = {
  /**
   * "Dead Beef" — 0xDEADBEEF
   * Classic sentinel used in IBM RS/6000, 32-bit systems, and C/C++ debug allocators
   * to mark freed/uninitialized memory. Widely used as default test mock hash.
   */
  DEADBEEF: "0xDEADBEEF",
  DEAD_BEEF_HASH: "deadbeef",

  /**
   * "Cafe Babe" — 0xCAFEBABE
   * Famous Java bytecode (.class) magic number and Apple Mach-O Universal Binary header.
   */
  CAFEBABE: "0xCAFEBABE",
  CAFE_BABE_HASH: "cafebabe",

  /**
   * "Bad Food" — 0xBAADF00D
   * Microsoft Windows debug heap marker for unallocated memory.
   */
  BAADF00D: "0xBAADF00D",
  BAAD_F00D_HASH: "baadf00d",

  /**
   * "Coffee" — 0x00C0FFEE / 0xC0FFEE
   * Warm beverage sentinel; ideal for standby states, pause screens, and keep-alive tests.
   */
  C0FFEE: "0x00C0FFEE",
  C0FFEE_HASH: "00c0ffee",

  /**
   * "Stage" — 0x00057A6E
   * StageSync's own hexspeak domain signature.
   */
  STAGE: "0x00057A6E",
  STAGE_HASH: "00057a6e",

  /**
   * "Feed Face" — 0xFEEDFACE
   * Apple Mach-O 32-bit binary header magic number.
   */
  FEEDFACE: "0xFEEDFACE",
  FEED_FACE_HASH: "feedface",

  /**
   * "Defecated" — 0xDEFEC8ED
   * Crash signature used in Sony PlayStation debugging.
   */
  DEFEC8ED: "0xDEFEC8ED",
  DEFEC8ED_HASH: "defec8ed",
} as const;

export type HexspeakKey = keyof typeof HEXSPEAK;
