import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const fsHooks = vi.hoisted(() => ({
  actual: null as null | typeof import("node:fs"),
  statSync: null as null | ((path: string) => unknown),
  existsSync: null as null | ((path: string) => boolean),
  readdirSync: null as null | ((path: string) => string[]),
  lstatSync: null as null | ((path: string) => unknown),
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  fsHooks.actual = actual;
  return {
    ...actual,
    statSync: ((path: Parameters<typeof actual.statSync>[0], opts?: unknown) => {
      if (fsHooks.statSync) return fsHooks.statSync(String(path)) as ReturnType<
        typeof actual.statSync
      >;
      return actual.statSync(path, opts as never);
    }) as typeof actual.statSync,
    existsSync: ((path: Parameters<typeof actual.existsSync>[0]) => {
      if (fsHooks.existsSync) return fsHooks.existsSync(String(path));
      return actual.existsSync(path);
    }) as typeof actual.existsSync,
    readdirSync: ((
      path: Parameters<typeof actual.readdirSync>[0],
      opts?: unknown,
    ) => {
      if (fsHooks.readdirSync) return fsHooks.readdirSync(String(path));
      return actual.readdirSync(path, opts as never);
    }) as typeof actual.readdirSync,
    lstatSync: ((path: Parameters<typeof actual.lstatSync>[0], opts?: unknown) => {
      if (fsHooks.lstatSync) return fsHooks.lstatSync(String(path)) as ReturnType<
        typeof actual.lstatSync
      >;
      return actual.lstatSync(path, opts as never);
    }) as typeof actual.lstatSync,
  };
});

import {
  isUnderAllowedRoot,
  listBrowseDirectory,
  resolveBrowseStartPath,
  toEnvPath,
} from "./path-browser.js";
import { REPO_ROOT } from "./storage/paths.js";

describe("path-browser", () => {
  const dirs: string[] = [];

  afterEach(() => {
    fsHooks.statSync = null;
    fsHooks.existsSync = null;
    fsHooks.readdirSync = null;
    fsHooks.lstatSync = null;
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function scratchUnderHome(): string {
    const dir = mkdtempSync(join(homedir(), ".stagesync-browse-"));
    dirs.push(dir);
    return dir;
  }

  it("rejects paths outside allowed roots", () => {
    expect(isUnderAllowedRoot("/etc")).toBe(false);
    expect(() => listBrowseDirectory("/etc", { mode: "dir" })).toThrow(/dozwolonym/);
  });

  it("toEnvPath uses relative ./ for repo paths and absolute outside", () => {
    expect(toEnvPath(REPO_ROOT)).toBe("./");
    expect(toEnvPath(join(REPO_ROOT, "data"))).toMatch(/^\.\//);
    expect(toEnvPath(join(homedir(), "somewhere-outside-repo"))).not.toMatch(
      /^\.\//,
    );
  });

  it("resolveBrowseStartPath handles dir, file, missing, and file-mode default", () => {
    const dir = scratchUnderHome();
    const nested = join(dir, "nested");
    mkdirSync(nested);
    const file = join(nested, "clip.wav");
    writeFileSync(file, "x");
    const fileAsParent = join(dir, "not-a-dir");
    writeFileSync(fileAsParent, "x");

    expect(resolveBrowseStartPath(nested)).toBe(resolve(nested));
    expect(resolveBrowseStartPath(file)).toBe(resolve(nested));
    expect(resolveBrowseStartPath(join(nested, "missing.txt"))).toBe(
      resolve(nested),
    );
    expect(
      resolveBrowseStartPath(join(fileAsParent, "child"), { mode: "dir" }),
    ).toBe(REPO_ROOT);
    expect(resolveBrowseStartPath("")).toBe(REPO_ROOT);
    expect(resolveBrowseStartPath("./data", { mode: "file" })).toBe(
      resolve(REPO_ROOT, "data"),
    );
    expect(resolveBrowseStartPath("/etc/passwd")).toBe(REPO_ROOT);
    expect(resolveBrowseStartPath("/etc/passwd", { mode: "file" })).toBe(
      resolve(REPO_ROOT, "data"),
    );
  });

  it("resolveBrowseStartPath falls through when candidate parent is unreadable", () => {
    let calls = 0;
    fsHooks.statSync = () => {
      calls += 1;
      if (calls === 1) {
        throw Object.assign(new Error("missing"), { code: "ENOENT" });
      }
      throw Object.assign(new Error("denied"), { code: "EACCES" });
    };

    const under = join(REPO_ROOT, "data", "ghost-parent", "ghost-file");
    expect(resolveBrowseStartPath(under, { mode: "dir" })).toBe(REPO_ROOT);
  });

  it("resolveBrowseStartPath file mode falls back to REPO_ROOT when data missing", () => {
    fsHooks.existsSync = () => false;
    expect(resolveBrowseStartPath("/etc/passwd", { mode: "file" })).toBe(
      REPO_ROOT,
    );
  });

  it("resolveBrowseStartPath file mode skips non-directory data path", () => {
    fsHooks.existsSync = () => true;
    fsHooks.statSync = () =>
      ({
        isDirectory: () => false,
        isFile: () => true,
      }) as unknown as ReturnType<typeof import("node:fs").statSync>;
    expect(resolveBrowseStartPath("/etc/passwd", { mode: "file" })).toBe(
      REPO_ROOT,
    );
  });

  it("lists directories and files with ext filter; skips symlinks", () => {
    const dir = scratchUnderHome();
    mkdirSync(join(dir, "subdir"));
    writeFileSync(join(dir, "keep.json"), "{}");
    writeFileSync(join(dir, "skip.txt"), "x");
    writeFileSync(join(dir, ".hidden"), "x");
    symlinkSync(join(dir, "keep.json"), join(dir, "link-json"));

    const asDir = listBrowseDirectory(dir, { mode: "dir" });
    expect(asDir.canSelectCurrent).toBe(true);
    expect(asDir.entries.every((e) => e.type === "dir")).toBe(true);
    expect(asDir.entries.map((e) => e.name)).toContain("subdir");
    expect(asDir.entries.map((e) => e.name)).not.toContain("keep.json");
    expect(asDir.entries.map((e) => e.name)).not.toContain("link-json");
    expect(asDir.entries.map((e) => e.name)).not.toContain(".hidden");

    const asFile = listBrowseDirectory(dir, { mode: "file", ext: "json" });
    expect(asFile.canSelectCurrent).toBe(false);
    expect(asFile.entries.map((e) => e.name).sort()).toEqual([
      "keep.json",
      "subdir",
    ]);
    expect(asFile.entries.find((e) => e.name === "keep.json")?.selectable).toBe(
      true,
    );
    expect(asFile.entries.find((e) => e.name === "subdir")?.selectable).toBe(
      false,
    );

    const dotted = listBrowseDirectory(dir, { mode: "file", ext: ".json" });
    expect(dotted.entries.some((e) => e.name === "keep.json")).toBe(true);

    const blankExt = listBrowseDirectory(dir, { mode: "file", ext: "   " });
    expect(blankExt.entries.some((e) => e.name === "skip.txt")).toBe(true);
  });

  it("returns null parent at home root and throws ENOENT / not-dir", () => {
    const home = listBrowseDirectory(homedir(), { mode: "dir" });
    expect(home.parent).toBeNull();
    expect(home.parentEnvPath).toBeNull();

    expect(() =>
      listBrowseDirectory(join(homedir(), "no-such-ss-browse-dir-xyz"), {
        mode: "dir",
      }),
    ).toThrow(/nie istnieje/i);

    const file = join(scratchUnderHome(), "only-file");
    writeFileSync(file, "x");
    expect(() => listBrowseDirectory(file, { mode: "dir" })).toThrow(
      /Oczekiwano katalogu/,
    );
  });

  it("maps non-ENOENT stat and readdir failures", () => {
    const dir = scratchUnderHome();

    fsHooks.statSync = () => {
      throw Object.assign(new Error("EACCES"), { code: "EACCES" });
    };
    expect(() => listBrowseDirectory(dir)).toThrow(/Nie można odczytać/);
    fsHooks.statSync = null;

    fsHooks.readdirSync = () => {
      throw Object.assign(new Error("EACCES"), { code: "EACCES" });
    };
    expect(() => listBrowseDirectory(dir)).toThrow(/Brak dostępu/);
  });

  it("skips entries whose lstat fails", () => {
    const dir = scratchUnderHome();
    writeFileSync(join(dir, "a.txt"), "x");
    writeFileSync(join(dir, "b.txt"), "y");

    fsHooks.lstatSync = (p) => {
      if (p.endsWith("a.txt")) throw new Error("gone");
      return fsHooks.actual!.lstatSync(p);
    };

    const result = listBrowseDirectory(dir, { mode: "file" });
    expect(result.entries.map((e) => e.name)).toEqual(["b.txt"]);
  });

  it("listBrowseDirectory defaults empty path to REPO_ROOT", () => {
    const result = listBrowseDirectory("", { mode: "dir" });
    expect(result.path).toBe(REPO_ROOT);
    expect(result.envPath).toBe("./");
  });
});
