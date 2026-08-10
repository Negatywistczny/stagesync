import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.turbo',
  'dist',
  'build',
  'coverage',
]);

function getAllMdFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (IGNORED_DIRS.has(file)) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllMdFiles(fullPath, fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const mdFiles = getAllMdFiles(ROOT);

// Dynamic targets: all *.md basenames + root config files (Dockerfile / json / yaml).
const rootItems = fs
  .readdirSync(ROOT)
  .filter((f) => !fs.statSync(path.join(ROOT, f)).isDirectory());
const rootConfigs = rootItems.filter(
  (f) =>
    f === 'Dockerfile' ||
    f.endsWith('.json') ||
    f.endsWith('.yaml') ||
    f.endsWith('.yml'),
);

const targets = Array.from(
  new Set([...mdFiles.map((f) => path.basename(f)), ...rootConfigs]),
);

let totalUnlinked = 0;
const unlinkedDetails = [];

for (const mdFile of mdFiles) {
  const content = fs.readFileSync(mdFile, 'utf8');
  const relMdPath = path.relative(ROOT, mdFile).replace(/\\/g, '/');
  const currentFileName = path.basename(mdFile);

  const lines = content.split('\n');
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // Mask HTML comments, inline code, and existing markdown links.
    line = line.replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length));
    line = line.replace(/`[^`]+`/g, (m) => ' '.repeat(m.length));
    line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m) => ' '.repeat(m.length));
    line = line.replace(/^\[[^\]]+\]:\s*.*$/g, (m) => ' '.repeat(m.length));

    for (const target of targets) {
      if (currentFileName === target) continue;

      const escapedTarget = target.replace(/\./g, '\\.');
      const regex = new RegExp(
        `(?<![a-zA-Z0-9_\\-\\/.\\\\])\\b${escapedTarget}\\b`,
        'g',
      );

      let match;
      while ((match = regex.exec(line)) !== null) {
        totalUnlinked++;
        unlinkedDetails.push(
          `${relMdPath}:${i + 1}: mentions "${target}" without link`,
        );
      }
    }
  }
}

console.log(`TOTAL UNLINKED REFERENCES FOUND: ${totalUnlinked}`);
for (const detail of unlinkedDetails.slice(0, 30)) {
  console.log(` - ${detail}`);
}
if (unlinkedDetails.length > 30) {
  console.log(` ... and ${unlinkedDetails.length - 30} more.`);
}
