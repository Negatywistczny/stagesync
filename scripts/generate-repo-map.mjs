import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Wychodzimy z launch/scripts/ do korzenia repozytorium (root)
const ROOT_DIR = path.resolve(__dirname, '../../');

// Kompletny słownik opisów architektonicznych i narzędziowych
const FOLDER_MAP = {
    // Dot-folders (Level 1 only)
    '.agents': 'Instrukcje i kontekst operacyjny dla autonomicznych agentów AI',
    '.cursor': 'Konfiguracja środowiska Cursor (agenci, komendy, reguły MDC, umiejętności)',
    '.github': 'Szablony zgłoszeń GitHub, wytyczne społeczności oraz workflows CI/CD',
    '.husky': 'Haki Git (m.in. pre-commit sanity gate do walidacji typów i mapy)',
    '.vscode': 'Ustawienia przestrzeni roboczej VS Code / Cursor (np. explorer file nesting)',

    // Main Level 1 directories
    'apps': 'Aplikacje wykonawcze i powłoki klienckie w monorepo',
    'data': 'Lokalne dane uruchomieniowe, projekty, pakiety i logi systemowe',
    'docs': 'Dokumentacja techniczna, specyfikacje architektoniczne i audyty',
    'launch': 'Narzędzia odpaleniowe, skrypty budowania oraz zasoby platformowe',
    'packages': 'Współdzielone pakiety wewnętrzne monorepo',

    // Main Level 2 under apps
    'apps/console': 'Android WebView shell dla interfejsu /admin (ADR 0016)',
    'apps/desktop': 'Tauri thin shell dla serwera lokalnego na desktop (ADR 0010)',
    'apps/performer': 'Android WebView shell dla interfejsu /client (ADR 0016)',
    'apps/server': 'Główny backend Node.js — SSOT Host, Master Clock, REST/WS API',
    'apps/web': 'Aplikacja webowa React/Vite (Admin, Client, Timeline, Mikser)',
    'apps/www': 'Strona domowa, portal informacyjny oraz aktualności StageSync',

    // Main Level 2 under data
    'data/downloads': 'Lokalne pliki wyjściowe i instalatory APK',
    'data/host': 'Lokalne pliki środowiska uruchomieniowego Hosta',
    'data/library': 'Główny plik bazy utworów (library.json) oraz szablony projektów',
    'data/logs': 'Buffer logów systemowych, diagnostyka i ślady wykonania',
    'data/projects': 'Katalog projektów użytkownika z lokalnymi zasobami assets/',

    // Level 2 under docs
    'docs/adr': 'Architectural Decision Records (Decyzje architektoniczne)',
    'docs/analysis': 'Audyty kodu, analizy wydajności, referencje DAW i specyfikacje',
    'docs/api': 'Specyfikacje interfejsów programistycznych REST i WebSocket',
    'docs/examples': 'Przykładowe pliki baz danych i pakiety projektowe v5',
    'docs/ui': 'Dokumentacja systemu designu, tokenów i komponentów UI',

    // Main Level 2 under launch
    'launch/android': 'Pliki keystore i zasoby do budowania wydań Android',
    'launch/scripts': 'Skrypty automatyzacji budowania, synchronizacji i generowania mapy',

    // Main Level 2 under packages
    'packages/eslint-config': 'Wspólne reguły ESLint dla całego repozytorium',
    'packages/shared': 'Logika domenowa SSOT, Zod schematy, przeliczenia czasu i akordów',
    'packages/typescript-config': 'Bazowe pliki tsconfig.json dla pism i aplikacji',
    'packages/ui': 'Biblioteka komponentów UI (przycisk, pole, menu, badge)'
};

console.log('🤖 Pobieranie listy plików z Git (z uwzględnieniem .gitignore)...');

let gitFiles = [];
try {
    const output = execSync('git ls-files --cached --others --exclude-standard', {
        cwd: ROOT_DIR,
        encoding: 'utf8'
    });
    gitFiles = output.split('\n').filter(Boolean);
} catch (error) {
    console.warn('⚠️ Ostrzeżenie: git ls-files nie powiódł się (brak repozytorium git lub środowisko bez git). Przechodzę na rekurencyjne czytanie katalogu przez fs...');
    function walkDir(dir, base = '') {
        let results = [];
        const list = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of list) {
            if (file.name === '.git' || file.name === 'node_modules' || file.name === '.turbo' || file.name === 'dist' || file.name === 'build' || file.name === 'coverage') continue;
            const resPath = path.join(dir, file.name);
            const relPath = base ? `${base}/${file.name}` : file.name;
            if (file.isDirectory()) {
                results = results.concat(walkDir(resPath, relPath));
            } else {
                results.push(relPath);
            }
        }
        return results;
    }
    try {
        gitFiles = walkDir(ROOT_DIR);
    } catch (fallbackError) {
        console.error('❌ Błąd podczas fallbacku przeszukiwania plików:', fallbackError.message);
        process.exit(1);
    }
}

// Budujemy drzewo folderów w pamięci
const tree = {};
let totalFiles = 0;
const extensionCount = {};

gitFiles.forEach(relPath => {
    totalFiles++;
    const ext = path.extname(relPath).toLowerCase() || 'brak rozszerzenia';
    extensionCount[ext] = (extensionCount[ext] || 0) + 1;

    const parts = relPath.split('/');
    let current = tree;

    parts.forEach((part, index) => {
        if (index === parts.length - 1) {
            current[part] = null; // Plik
        } else {
            if (!current[part]) {
                current[part] = {};
            }
            current = current[part]; // Katalog
        }
    });
});

/**
 * Generuje przegląd dla folderów z kropką (tylko Poziom 1)
 */
function getDotFoldersOverview(node) {
    let overviewStr = '';
    const keys = Object.keys(node).filter(k => k.startsWith('.') && node[k] !== null).sort();

    keys.forEach(key => {
        const description = FOLDER_MAP[key] || '';
        const descText = description ? ` — ${description}` : '';
        overviewStr += `- **${key}/**${descText}\n`;
    });

    return overviewStr;
}

/**
 * Generuje przegląd dla głównych folderów architektonicznych (Poziom 1 i 2)
 */
function getMainFoldersOverview(node, currentPath = '') {
    let overviewStr = '';
    const keys = Object.keys(node)
        .filter(k => node[k] !== null && (!currentPath ? !k.startsWith('.') : true))
        .sort();

    keys.forEach(key => {
        const fullRelPath = currentPath ? `${currentPath}/${key}` : key;
        const depth = fullRelPath.split('/').length;

        let description = FOLDER_MAP[fullRelPath] || '';

        if (!description) {
            const pkgPath = path.join(ROOT_DIR, fullRelPath, 'package.json');
            if (fs.existsSync(pkgPath)) {
                try {
                    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                    description = pkg.description || (pkg.name ? `\`${pkg.name}\`` : '');
                } catch { }
            }
        }

        const indent = '  '.repeat(depth - 1);
        const descText = description ? ` — ${description}` : '';
        overviewStr += `${indent}- **${key}/**${descText}\n`;

        // Schodzimy do drugiego poziomu tylko dla głównych katalogów
        if (depth < 2 && node[key]) {
            overviewStr += getMainFoldersOverview(node[key], fullRelPath);
        }
    });

    return overviewStr;
}

/**
 * Renderuje pełne drzewo plików
 */
let totalDirs = 0;
function renderTree(node, indent = '') {
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

        if (isDir) {
            totalDirs++;
            result += `${indent}${pointer}${key}/\n`;
            const newIndent = indent + (isLast ? '    ' : '│   ');
            result += renderTree(node[key], newIndent);
        } else {
            result += `${indent}${pointer}${key}\n`;
        }
    });

    return result;
}

const dotFoldersOverview = getDotFoldersOverview(tree);
const mainFoldersOverview = getMainFoldersOverview(tree);
const treeOutput = renderTree(tree);

const statsTable = Object.entries(extensionCount)
    .sort((a, b) => b[1] - a[1])
    .map(([ext, count]) => `| \`${ext}\` | ${count} |`)
    .join('\n');

const markdownContent = `# 🗺️ REPO MAP & CONTEXT (Automatycznie wygenerowano)

> ⚠️ **Uwaga dla Agentów AI / LLM:** Ten plik zawiera wygenerowaną mapę struktury wyłącznie nieignorowanych plików w repozytorium StageSync (zgodnie z .gitignore). Nie edytuj go ręcznie.

---

## 📊 Statystyki Repozytorium (Śledzone w Git)
* **Liczba wszystkich plików:** ${totalFiles}
* **Liczba katalogów:** ${totalDirs}
* **Data aktualizacji:** ${new Date().toISOString()}

### Podział według rozszerzeń
| Rozszerzenie | Liczba plików |
| :--- | :--- |
${statsTable}

---

## 🏛️ Przegląd Architektury (Poziomy 1 i 2)

${mainFoldersOverview || 'Brak katalogów.'}

---

## ⚙️ Konfiguracja i Środowisko (Katalogi Narzędziowe)

${dotFoldersOverview || 'Brak katalogów.'}

---

## 📂 Pełne Drzewo Katalogów i Plików

\`\`\`text
${path.basename(ROOT_DIR)}/
${treeOutput}\`\`\`
`;

const outputPath = path.join(ROOT_DIR, 'docs', 'REPO_MAP.md');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, markdownContent, 'utf8');

console.log(`✅ Pomyślnie zaktualizowano mapę w: docs/REPO_MAP.md`);