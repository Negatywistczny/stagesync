import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());

const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.turbo', 'dist', 'build', 'coverage', '.github', 'data'
]);

function getAllMdFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (IGNORE_DIRS.has(file)) continue;
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

// Build target map of all files in repo (including extensionless root files like 'dev')
function getTargetMap() {
  const targetMap = new Map();

  function scan(currentDir) {
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
      if (IGNORE_DIRS.has(file)) continue;
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scan(fullPath);
      } else {
        const ext = path.extname(file);
        const relToRoot = path.relative(ROOT, fullPath).replace(/\\/g, '/');
        
        // Include files with extensions or specific known root scripts like 'dev'
        if ((ext && ext !== '') || relToRoot === 'dev') {
          targetMap.set(relToRoot, fullPath);
          const baseName = path.basename(file);
          if (!targetMap.has(baseName)) {
            targetMap.set(baseName, fullPath);
          }
        }
      }
    }
  }

  scan(ROOT);
  return targetMap;
}

const targetMap = getTargetMap();

function run() {
  const mdFiles = getAllMdFiles(ROOT);
  let totalFixed = 0;

  for (const mdFile of mdFiles) {
    let content = fs.readFileSync(mdFile, 'utf8');
    const mdDir = path.dirname(mdFile);
    const relMdPath = path.relative(ROOT, mdFile).replace(/\\/g, '/');

    const lines = content.split(/\r?\n/);
    let inCodeBlock = false;
    let modified = false;

    const newLines = lines.map(line => {
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        return line;
      }
      if (inCodeBlock) return line;

      let updatedLine = line;

      // Sort targets by length descending so longer/more specific paths match first
      const sortedTargets = Array.from(targetMap.entries()).sort((a, b) => b[0].length - a[0].length);

      for (const [targetKey, targetAbsPath] of sortedTargets) {
        if (path.resolve(mdFile) === path.resolve(targetAbsPath)) continue;

        let relLink = path.relative(mdDir, targetAbsPath).replace(/\\/g, '/');
        if (!relLink.startsWith('.') && !relLink.startsWith('/')) {
          relLink = './' + relLink;
        }

        // Match backticks containing targetKey or relToRoot, e.g. `dev`, `dev.cmd`, `scripts/dev-hub.ts`
        const escapedKey = targetKey.replace(/\./g, '\\.').replace(/\//g, '\\/');
        const inlineCodeRegex = new RegExp(`\`(${escapedKey})\``, 'g');

        updatedLine = updatedLine.replace(inlineCodeRegex, (match, p1) => {
          // If already inside a markdown link, skip
          if (match.includes('[') || match.includes(']')) return match;
          totalFixed++;
          modified = true;
          return `[\`${p1}\`](${relLink})`;
        });
      }

      return updatedLine;
    });

    if (modified) {
      fs.writeFileSync(mdFile, newLines.join('\n'), 'utf8');
      console.log(`Updated inline links in: ${relMdPath}`);
    }
  }

  console.log(`Total inline file references converted to markdown links: ${totalFixed}`);
}

run();
