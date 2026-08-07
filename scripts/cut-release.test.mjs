import assert from "node:assert/strict";
import {
  bumpSemver,
  cutChangelog,
  heroForCut,
  lineKey,
  parseArgs,
  parseStableSemver,
  setPackageVersion,
  todayLocalISO,
} from "./cut-release.mjs";

assert.deepEqual(parseStableSemver("5.4.7"), {
  major: 5,
  minor: 4,
  patch: 7,
  raw: "5.4.7",
});
assert.throws(() => parseStableSemver("5.4.7-alpha.1"), /stabilnego SemVer/);

assert.equal(bumpSemver("5.4.7", "patch"), "5.4.8");
assert.equal(bumpSemver("5.4.7", "minor"), "5.5.0");
assert.equal(bumpSemver("5.4.7", "major"), "6.0.0");

assert.equal(lineKey("5.5.0"), "5.5");
assert.equal(heroForCut("5.4.8"), null);
assert.equal(heroForCut("5.5.0"), "Pitch & FX");
assert.equal(heroForCut("6.0.0"), "Live Suite");
assert.throws(() => heroForCut("9.9.0"), /LINE_HEROES/);

assert.equal(todayLocalISO(new Date("2026-08-07T15:00:00")), "2026-08-07");

const opts = parseArgs([
  "node",
  "cut-release.mjs",
  "patch",
  "--yes",
  "--date",
  "2026-08-07",
]);
assert.equal(opts.kind, "patch");
assert.equal(opts.yes, true);
assert.equal(opts.date, "2026-08-07");
assert.throws(() => parseArgs(["node", "cut-release.mjs"]), /patch \| minor/);
assert.throws(
  () => parseArgs(["node", "cut-release.mjs", "patch", "--push", "--no-commit"]),
  /--push/,
);

const sample = `# Changelog

## [Unreleased]

### Dodano

#### App Shell
- **Import:** foo

### Naprawiono

- **USDB:** bar

## [5.4.7](https://github.com/Negatywistczny/stagesync/compare/v5.4.6...v5.4.7) - 2026-08-07

### Zmieniono
- old
`;

const cut = cutChangelog(sample, {
  prevVersion: "5.4.7",
  nextVersion: "5.4.8",
  date: "2026-08-08",
  hero: null,
});

assert.match(
  cut,
  /^## \[5\.4\.8\]\(https:\/\/github\.com\/Negatywistczny\/stagesync\/compare\/v5\.4\.7\.\.\.v5\.4\.8\) - 2026-08-08$/m,
);
assert.match(cut, /## \[5\.4\.8\].*\n\n### Dodano/s);
assert.match(cut, /- \*\*Import:\*\* foo/);
assert.match(cut, /## \[5\.4\.7\]/);
assert.doesNotMatch(cut, /\[Unreleased\]/);

assert.throws(
  () =>
    cutChangelog(sample.replace("Negatywistczny", "Negatywistyczny"), {
      prevVersion: "5.4.7",
      nextVersion: "5.4.8",
      date: "2026-08-08",
      hero: null,
    }),
  /Negatywistyczny/,
);

assert.throws(
  () =>
    cutChangelog(sample, {
      prevVersion: "5.4.7",
      nextVersion: "5.4.7",
      date: "2026-08-08",
      hero: null,
    }),
  /już ma sekcję/,
);

assert.throws(
  () =>
    cutChangelog(
      `# Changelog\n\n## [Unreleased]\n\n## [5.4.7] - 2026-08-07\n`,
      {
        prevVersion: "5.4.7",
        nextVersion: "5.4.8",
        date: "2026-08-08",
        hero: null,
      },
    ),
  /pusta/,
);

const withHero = cutChangelog(sample, {
  prevVersion: "5.4.7",
  nextVersion: "5.5.0",
  date: "2026-09-01",
  hero: "Pitch & FX",
});
assert.match(withHero, /## \[5\.5\.0\].* — Pitch & FX$/m);

const pkg = setPackageVersion(
  JSON.stringify({ name: "stagesync", version: "5.4.7" }, null, 2) + "\n",
  "5.4.8",
);
assert.equal(JSON.parse(pkg).version, "5.4.8");

console.log("cut-release.test.mjs: ok");
