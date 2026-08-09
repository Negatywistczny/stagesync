import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../..');
const OUTPUT_REL = 'docs/REPO_MAP.md';

const INCLUDE_UNTRACKED = process.argv.includes('--include-untracked');
const FULL_TREE = process.argv.includes('--full');

/** Slim: listuj pliki/katalogi do tej głębokości ścieżki (segmenty). */
const SLIM_MAX_DEPTH = 5;
/** Slim: kolapsuj katalog, gdy ≥ N plików-assetów (rekurencyjnie). */
const ASSET_COLLAPSE_MIN = 8;

const ASSET_EXTS = new Set([
    '.png', '.jpg', '.jpeg', '.svg', '.bmp', '.ico', '.icns', '.webp',
    '.mp3', '.wav', '.apk', '.jar', '.keystore'
]);

const CODE_EXTS = new Set([
    '.ts', '.tsx', '.js', '.mjs', '.cjs', '.kt', '.kts', '.rs', '.css', '.scss', '.cpp', '.h', '.java'
]);
const DOC_EXTS = new Set(['.md', '.mdc', '.txt', '.rtf']);
const CFG_EXTS = new Set([
    '.json', '.jsonc', '.yml', '.yaml', '.toml', '.xml', '.properties',
    '.example', '.pro', '.lock', '.html', '.webmanifest', '.sh', '.gradle'
]);

/** Nazwy katalogów zawsze kolapsowane w trybie slim. */
const COLLAPSE_DIR_NAMES = new Set([
    'icons',
    'mipmap-hdpi', 'mipmap-mdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi',
    'drawable', 'drawable-hdpi', 'drawable-mdpi', 'drawable-xhdpi', 'drawable-xxhdpi', 'drawable-xxxhdpi',
    'drawable-v24', 'mipmap-anydpi-v26'
]);

/** Prefiksy ścieżek kolapsowane w slim (cały poddrzewo → jedna linia). */
const COLLAPSE_PATH_PREFIXES = [
    'apps/desktop/src-tauri/icons',
    'docs/analysis/inspiracje/audyty-silnik',
    'docs/analysis/inspiracje/referencje-daw',
    'docs/analysis/inspiracje/specyfikacje',
    'docs/analysis/inspiracje/testy-pokrycie',
    'docs/analysis/inspiracje/www',
    'docs/analysis/reports/milestones',
    'docs/analysis/reports/hygiene'
];

const FOLDER_MAP = {
    '.agents': 'Instrukcje i kontekst operacyjny dla autonomicznych agentów AI',
    '.cursor': 'Konfiguracja środowiska Cursor (agenci, komendy, reguły MDC, umiejętności)',
    '.cursor/agents': 'Definicje agentów Cursor (np. night-auditor)',
    '.cursor/commands': 'Komendy slash / prompt templates',
    '.cursor/rules': 'Reguły MDC (konstytucja, changelog, parity, layout)',
    '.cursor/skills': 'Umiejętności agentów (night-audit, triage-verify)',
    '.github': 'Szablony zgłoszeń GitHub, wytyczne społeczności oraz workflows CI/CD',
    '.github/workflows': 'Pipeline’y GitHub Actions (CI, release, codeql)',
    '.github/codeql': 'Konfiguracja analizy statycznej CodeQL',
    '.github/ISSUE_TEMPLATE': 'Szablony issue',
    '.husky': 'Haki Git (m.in. pre-commit sanity gate do walidacji typów i mapy)',
    '.vscode': 'Ustawienia przestrzeni roboczej VS Code / Cursor (np. explorer file nesting)',

    'apps': 'Aplikacje wykonawcze i powłoki klienckie w monorepo',
    'data': 'Lokalne dane uruchomieniowe, projekty, pakiety i logi systemowe',
    'docs': 'Dokumentacja techniczna, specyfikacje architektoniczne i audyty',
    'packages': 'Współdzielone pakiety wewnętrzne monorepo',
    'scripts': 'Skrypty monorepo (mapa repo, release notes, lint CSS, merge-train)',

    'apps/console': 'Android WebView shell dla interfejsu /admin (ADR 0016)',
    'apps/desktop': 'Tauri thin shell dla serwera lokalnego na desktop (ADR 0010)',
    'apps/performer': 'Android WebView shell dla interfejsu /client (ADR 0016)',
    'apps/server': 'Główny backend Node.js — SSOT Host, Master Clock, REST/WS API',
    'apps/web': 'Aplikacja webowa React/Vite (Admin, Client, Timeline, Mikser)',
    'apps/web/e2e': 'Testy integracyjne E2E (Playwright)',
    'apps/web/public': 'Zasoby statyczne i favicon',
    'apps/web/public/brand': 'Materiały brandingowe i logotypy StageSync',
    'apps/web/scripts': 'Skrypty pomocnicze builda i benchmarków webowych',
    'apps/web/scripts/benchmark': 'Skrypty benchmarków wydajnościowych UI/Audio',
    'apps/web/src': 'Kod źródłowy UI i logiki klienta',
    'apps/web/src/dev': 'Narzędzia i panele deweloperskie wewnątrz aplikacji',
    'apps/web/src/lib': 'Biblioteki klienta (5 kategorii — bez plików w lib root)',
    'apps/web/src/lib/audio': 'DSP, AudioContext, tempo, waveform',
    'apps/web/src/lib/timeline': 'Silnik renderowania timeline (bez mutacji treści)',
    'apps/web/src/lib/timeline-edit': 'Mutacje treści klipów (akordy, cue, forma, tekst)',
    'apps/web/src/lib/client': 'Preferencje, mostek desktop, i18n shell, utilities UI',
    'apps/web/src/lib/shell-operator': 'Operatory CRUD API / aktywny projekt',
    'apps/web/src/shells': 'Powłoki Admin / Client / Timeline',
    'apps/web/src/transport': 'Transport WS, playhead, probe wydajności',
    'apps/web/test': 'Testy jednostkowe i mocki aplikacji webowej',
    'apps/web/test/benchmark': 'Testy wydajnościowe struktur danych',
    'apps/web/test/fixtures': 'Przykładowe dane testowe projektów i timeline',
    'apps/www': 'Strona domowa, portal informacyjny oraz aktualności StageSync',

    'data/downloads': 'Lokalne pliki wyjściowe i instalatory APK',
    'data/host': 'Lokalne pliki środowiska uruchomieniowego Hosta',
    'data/library': 'Główny plik bazy utworów (library.json) oraz szablony projektów',
    'data/logs': 'Buffer logów systemowych, diagnostyka i ślady wykonania',
    'data/projects': 'Katalog projektów użytkownika z lokalnymi zasobami assets/',

    'docs/adr': 'Architectural Decision Records (Decyzje architektoniczne)',
    'docs/analysis': 'Audyty kodu, analizy wydajności, referencje DAW i specyfikacje',
    'docs/analysis/reports': 'Raporty kanoniczne (current / milestones / hygiene)',
    'docs/analysis/inspiracje': 'Dumpy zewnętrzne + triage (nie SSOT produktu)',
    'docs/analysis/working': 'Notatki robocze (gitignored treści, tylko README/.gitignore)',
    'docs/api': 'Specyfikacje interfejsów programistycznych REST i WebSocket',
    'docs/examples': 'Przykładowe pliki baz danych i pakiety projektowe v5',
    'docs/guides': 'Podręczniki operatorskie (INSTALL, DESKTOP, MOBILE, MIGRATION)',
    'docs/ui': 'Dokumentacja systemu designu, tokenów i komponentów UI',

    'packages/android-keystore': 'Keystore do sideloadu / podpisywania APK (lokalny, nie sekret produkcyjny CI)',
    'packages/eslint-config': 'Wspólne reguły ESLint dla całego repozytorium',
    'packages/shared': 'Logika domenowa SSOT, Zod schematy, przeliczenia czasu i akordów',
    'packages/typescript-config': 'Bazowe pliki tsconfig.json dla paczek i aplikacji',
    'packages/ui': 'Biblioteka komponentów UI (przycisk, pole, menu, badge)',

    'scripts/merge-train': 'Automatyzacja merge train i walidacji PR',
    'scripts/quality': 'Narzędzia jakości kodu, linków i generator mapy repozytorium',
    'scripts/release': 'Skrypty wydań SemVer, budowania paczek i release notes',
    'scripts/setup': 'Skrypty inicjalizacyjne i setupu środowiska deweloperskiego'
};

/**
 * Maksymalna głębokość overview dla danej ścieżki katalogu.
 * Domyślnie 2; wybrane powierzchnie mają L3+.
 */
function overviewMaxDepth(fullRelPath) {
    if (fullRelPath.startsWith('apps/web/src/lib')) return 5;
    if (fullRelPath.startsWith('apps/web')) return 4;
    if (fullRelPath.startsWith('docs/analysis')) return 3;
    if (fullRelPath.startsWith('.cursor')) return 2;
    if (fullRelPath.startsWith('.github')) return 2;
    return 2;
}

function insertPath(tree, relPath) {
    const parts = relPath.split('/').filter(Boolean);
    if (parts.length === 0) return;

    let current = tree;
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLeaf = i === parts.length - 1;

        if (isLeaf) {
            if (current[part] !== undefined && current[part] !== null) {
                console.warn(`⚠️ Pominięto plik (kolizja z katalogiem): ${relPath}`);
                return;
            }
            current[part] = null;
            return;
        }

        if (current[part] === null) {
            console.warn(`⚠️ Pominięto ścieżkę (kolizja: „${part}” jest plikiem): ${relPath}`);
            return;
        }
        if (current[part] === undefined || typeof current[part] !== 'object') {
            current[part] = {};
        }
        current = current[part];
    }
}

function countFilesInTree(node) {
    let n = 0;
    for (const key of Object.keys(node)) {
        if (node[key] === null) n += 1;
        else n += countFilesInTree(node[key]);
    }
    return n;
}

function countDirsInTree(node) {
    let n = 0;
    for (const key of Object.keys(node)) {
        if (node[key] !== null) {
            n += 1 + countDirsInTree(node[key]);
        }
    }
    return n;
}

function extBreakdown(node, counts = {}) {
    for (const key of Object.keys(node)) {
        if (node[key] === null) {
            const ext = path.extname(key).toLowerCase() || 'brak';
            counts[ext] = (counts[ext] || 0) + 1;
        } else {
            extBreakdown(node[key], counts);
        }
    }
    return counts;
}

function formatExtSummary(counts) {
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([ext, n]) => (ext === 'brak' ? `bez rozsz. ×${n}` : `${ext} ×${n}`))
        .join(', ');
}

function plFiles(n) {
    if (n === 1) return '1 plik';
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} pliki`;
    return `${n} plików`;
}

function plSubdirs(n) {
    if (n === 1) return '1 podkatalog';
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} podkatalogi`;
    return `${n} podkatalogów`;
}

function shouldCollapseDir(dirName, fullRelPath, childNode) {
    if (FULL_TREE) return false;
    if (COLLAPSE_DIR_NAMES.has(dirName)) return true;
    if (COLLAPSE_PATH_PREFIXES.includes(fullRelPath)) return true;

    const fileCount = countFilesInTree(childNode);
    if (fileCount < ASSET_COLLAPSE_MIN) return false;

    const counts = extBreakdown(childNode);
    let assetFiles = 0;
    let codeFiles = 0;
    for (const [ext, n] of Object.entries(counts)) {
        if (ext === 'brak') continue;
        if (ASSET_EXTS.has(ext)) assetFiles += n;
        if (CODE_EXTS.has(ext)) codeFiles += n;
    }
    // Nie kolapsuj katalogów z kodem źródłowym (np. src-tauri z .rs + ikonami)
    if (codeFiles > 0) return false;
    return assetFiles / fileCount >= 0.8;
}

function resolveDescription(fullRelPath) {
    let description = FOLDER_MAP[fullRelPath] || '';
    if (description) return description;

    const pkgPath = path.join(ROOT_DIR, fullRelPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            description = pkg.description || (pkg.name ? `\`${pkg.name}\`` : '');
        } catch (parseError) {
            console.warn(`⚠️ Nieparsowalny package.json: ${fullRelPath}/package.json (${parseError.message})`);
        }
    }
    return description;
}

function buildPrefixCounts(files) {
    const counts = new Map();
    for (const relPath of files) {
        const parts = relPath.split('/');
        for (let i = 1; i < parts.length; i++) {
            const prefix = parts.slice(0, i).join('/');
            counts.set(prefix, (counts.get(prefix) || 0) + 1);
        }
        // Sam plik w root — nie jest katalogiem
    }
    return counts;
}

/**
 * Overview katalogów (architektura + dot), z counts i L3+ tam gdzie trzeba.
 */
function getFoldersOverview(node, currentPath = '', opts = { dotsOnly: false, skipDots: false }) {
    let overviewStr = '';
    const keys = Object.keys(node)
        .filter((k) => {
            if (node[k] === null) return false;
            if (!currentPath) {
                if (opts.dotsOnly) return k.startsWith('.');
                if (opts.skipDots) return !k.startsWith('.');
            }
            return true;
        })
        .sort();

    keys.forEach((key) => {
        const fullRelPath = currentPath ? `${currentPath}/${key}` : key;
        const depth = fullRelPath.split('/').length;
        const fileCount = opts.prefixCounts.get(fullRelPath) || countFilesInTree(node[key]);
        const description = resolveDescription(fullRelPath);
        const indent = '  '.repeat(depth - 1);
        const descText = description ? ` — ${description}` : '';
        overviewStr += `${indent}- **${key}/** (${fileCount})${descText}\n`;

        const maxDepth = overviewMaxDepth(fullRelPath);
        if (depth < maxDepth && node[key]) {
            overviewStr += getFoldersOverview(node[key], fullRelPath, {
                ...opts,
                dotsOnly: false,
                skipDots: false
            });
        }
    });

    return overviewStr;
}

function getRootFilesSection(files) {
    const rootFiles = files
        .filter((f) => !f.includes('/'))
        .sort((a, b) => a.localeCompare(b));
    if (rootFiles.length === 0) return '';

    const groups = {
        'Repozytorium & Tooling': ['.clineignore', '.clinerules', '.cursorignore', '.cursorindexingignore', '.dockerignore', '.editorconfig', '.gitignore', '.npmrc', '.nvmrc', 'codecov.yml', 'commitlint.config.js', 'knip.jsonc', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'turbo.json'],
        'Dokumentacja': ['CHANGELOG.md', 'LICENSE', 'README.md'],
        'Docker & Compose': ['compose.prod.yml', 'compose.yml', 'Dockerfile'],
        'Skrypty': ['dev', 'dev.cmd', 'dev.ps1']
    };

    let output = '';
    const processed = new Set();

    for (const [group, filesInGroup] of Object.entries(groups)) {
        const filtered = rootFiles.filter(f => filesInGroup.includes(f));
        if (filtered.length > 0) {
            output += `\n### ${group}\n`;
            output += filtered.map(f => `- [\`${f}\`](../${f})`).join('\n') + '\n';
            filtered.forEach(f => processed.add(f));
        }
    }

    const others = rootFiles.filter(f => !processed.has(f));
    if (others.length > 0) {
        output += `\n### Pozostałe\n`;
        output += others.map(f => `- [\`${f}\`](../${f})`).join('\n') + '\n';
    }

    return output.trim();
}

/**
 * Render drzewa. Slim: kolaps assetów + limit głębokości.
 */
let renderedDirs = 0;
function renderTree(node, indent = '', currentPath = '') {
    let result = '';
    const keys = Object.keys(node).sort((a, b) => {
        const aIsDir = node[a] !== null;
        const bIsDir = node[b] !== null;
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.localeCompare(b);
    });

    keys.forEach((key, index) => {
        const isLast = index === keys.length - 1;
        const pointer = isLast ? '└── ' : '├── ';
        const isDir = node[key] !== null;
        const fullRelPath = currentPath ? `${currentPath}/${key}` : key;
        const depth = fullRelPath.split('/').length;

        if (isDir) {
            renderedDirs++;
            const child = node[key];

            if (shouldCollapseDir(key, fullRelPath, child)) {
                const n = countFilesInTree(child);
                const summary = formatExtSummary(extBreakdown(child));
                result += `${indent}${pointer}${key}/  … (${plFiles(n)}: ${summary})\n`;
                return;
            }

            if (!FULL_TREE && depth >= SLIM_MAX_DEPTH) {
                const n = countFilesInTree(child);
                const subdirs = Object.keys(child).filter((k) => child[k] !== null).length;
                const filesHere = Object.keys(child).filter((k) => child[k] === null).length;
                let line = `${indent}${pointer}${key}/  … (${plFiles(n)}`;
                if (subdirs) line += `, ${plSubdirs(subdirs)}`;
                if (filesHere && subdirs) line += `; ${plFiles(filesHere)} bezpośrednio`;
                line += ')\n';
                result += line;
                return;
            }

            result += `${indent}${pointer}${key}/\n`;
            const newIndent = indent + (isLast ? '    ' : '│   ');
            result += renderTree(child, newIndent, fullRelPath);
        } else {
            result += `${indent}${pointer}${key}\n`;
        }
    });

    return result;
}

function categorizeExtensions(extensionCount) {
    let code = 0;
    let docs = 0;
    let assets = 0;
    let cfg = 0;
    let other = 0;
    for (const [ext, n] of Object.entries(extensionCount)) {
        if (CODE_EXTS.has(ext)) code += n;
        else if (DOC_EXTS.has(ext)) docs += n;
        else if (ASSET_EXTS.has(ext)) assets += n;
        else if (CFG_EXTS.has(ext) || ext === 'brak rozszerzenia') {
            if (ext === 'brak rozszerzenia') other += n;
            else cfg += n;
        } else other += n;
    }
    return { code, docs, assets, cfg, other };
}

const lsFilesCmd = INCLUDE_UNTRACKED
    ? 'git ls-files --cached --others --exclude-standard'
    : 'git ls-files --cached';

console.log(
    INCLUDE_UNTRACKED
        ? '🤖 Pobieranie listy plików z Git (tracked + untracked nieignorowane)...'
        : '🤖 Pobieranie listy plików śledzonych w Git...'
);
console.log(FULL_TREE ? '📂 Tryb drzewa: full' : '📂 Tryb drzewa: slim (domyślny; --full = pełne)');

let gitFiles = [];
try {
    const output = execSync(lsFilesCmd, {
        cwd: ROOT_DIR,
        encoding: 'utf8'
    });
    gitFiles = output.split(/\r?\n/).filter(Boolean);
} catch (error) {
    console.error('❌ generate-repo-map: error running git ls-files. Ensure git is installed and you are in a git repository.');
    console.error('💡 Tip: run .\\dev doctor (or ./dev doctor) to verify environment prerequisites.');
    console.error(error);
    process.exit(1);
}

const tree = {};
let totalFiles = 0;
const extensionCount = {};

gitFiles.forEach((relPath) => {
    totalFiles++;
    const ext = path.extname(relPath).toLowerCase() || 'brak rozszerzenia';
    extensionCount[ext] = (extensionCount[ext] || 0) + 1;

    // Self-reference mapy — nie w drzewie (nadal w stats)
    if (relPath === OUTPUT_REL) return;
    insertPath(tree, relPath);
});

const prefixCounts = buildPrefixCounts(gitFiles);
const totalDirs = countDirsInTree(tree);

const mainFoldersOverview = getFoldersOverview(tree, '', {
    skipDots: true,
    prefixCounts
}).trimEnd();

const dotFoldersOverview = getFoldersOverview(tree, '', {
    dotsOnly: true,
    prefixCounts
}).trimEnd();

const rootFilesSection = getRootFilesSection(gitFiles);

renderedDirs = 0;
const treeOutput = renderTree(tree);

const cats = categorizeExtensions(extensionCount);
const topExt = Object.entries(extensionCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
const restExtCount = Object.entries(extensionCount)
    .sort((a, b) => b[1] - a[1])
    .slice(10)
    .reduce((sum, [, n]) => sum + n, 0);

const statsTable = [
    ...topExt.map(([ext, count]) => `| \`${ext}\` | ${count} |`),
    ...(restExtCount > 0 ? [`| _(pozostałe)_ | ${restExtCount} |`] : [])
].join('\n');

const scopeNote = INCLUDE_UNTRACKED
    ? 'plików śledzonych w Git oraz lokalnych nieignorowanych (flaga `--include-untracked`)'
    : 'wyłącznie plików śledzonych w Git (bez untracked)';

const treeModeNote = FULL_TREE
    ? 'pełne drzewo (`--full`)'
    : 'drzewo slim (kolaps assetów, limit głębokości; `--full` = bez skrótów)';

const statsTitle = INCLUDE_UNTRACKED
    ? 'Statystyki Repozytorium (tracked + untracked)'
    : 'Statystyki Repozytorium (Śledzone w Git)';

const markdownContent = `# 🗺️ REPO MAP & CONTEXT (Automatycznie wygenerowano)

> ⚠️ **Uwaga dla Agentów AI / LLM:** Ten plik zawiera wygenerowaną mapę struktury ${scopeNote} w repozytorium StageSync (${treeModeNote}). Nie edytuj go ręcznie.

---

## 📊 ${statsTitle}

* **Liczba wszystkich plików:** ${totalFiles}
* **Liczba katalogów:** ${totalDirs}
* **Data aktualizacji:** ${new Date().toISOString()}

### Kategorie

| Kategoria | Liczba plików |
| :--- | ---: |
| Kod | ${cats.code} |
| Docs | ${cats.docs} |
| Config | ${cats.cfg} |
| Assety | ${cats.assets} |
| Inne | ${cats.other} |

### Top rozszerzenia

| Rozszerzenie | Liczba plików |
| :--- | ---: |
${statsTable}

---

## 🏛️ Przegląd Architektury

${mainFoldersOverview || 'Brak katalogów.'}

---

## ⚙️ Konfiguracja i Środowisko (Katalogi Narzędziowe)

${dotFoldersOverview || 'Brak katalogów.'}

---

## 📎 Pliki w root monorepo

${rootFilesSection || 'Brak.'}

---

## 📂 Drzewo Katalogów i Plików

\`\`\`text
${path.basename(ROOT_DIR)}/
${treeOutput}\`\`\`
`;

const outputPath = path.join(ROOT_DIR, OUTPUT_REL);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

/** Ignore the clock stamp so identical trees do not dirty git / block status. */
const DATE_LINE_RE = /^\* \*\*Data aktualizacji:\*\*.*$/m;
function structuralFingerprint(md) {
  return md
    .replace(/\r\n/g, '\n')
    .replace(DATE_LINE_RE, '* **Data aktualizacji:** <stamp>');
}

let existing = '';
if (fs.existsSync(outputPath)) {
  existing = fs.readFileSync(outputPath, 'utf8');
}

const lineCount = markdownContent.split(/\r?\n/).length;
if (
  existing &&
  structuralFingerprint(existing) === structuralFingerprint(markdownContent)
) {
  console.log(
    `⏭️  ${OUTPUT_REL} bez zmian strukturalnych — pomijam zapis (${totalFiles} plików, ${lineCount} linii, tryb ${FULL_TREE ? 'full' : 'slim'})`,
  );
} else {
  const newline = existing.includes('\r\n') ? '\r\n' : '\n';
  const toWrite =
    newline === '\r\n'
      ? markdownContent.replace(/\r?\n/g, '\r\n')
      : markdownContent;
  fs.writeFileSync(outputPath, toWrite, 'utf8');
  console.log(
    `✅ Zaktualizowano ${OUTPUT_REL} (${totalFiles} plików, ${lineCount} linii mapy, tryb ${FULL_TREE ? 'full' : 'slim'})`,
  );
}
