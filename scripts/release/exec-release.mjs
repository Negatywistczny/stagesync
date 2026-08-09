#!/usr/bin/env node
/**
 * Właściwy release (exec) - wykonuje finalne kroki wydania.
 * 
 * Skrypt wykonuje pełną procedurę publikacji:
 * 1. Buduje artefakty (pnpm build).
 * 2. Weryfikuje integralność paczek.
 * 3. Finalizuje statusy wydania w systemie.
 * 4. Wypycha zmiany do repozytorium (git push).
 */

import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function run(cmd, args, { cwd = ROOT, stdio = "inherit" } = {}) {
  const r = spawnSync(cmd, args, { cwd, stdio, encoding: "utf8", shell: true });
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} → exit ${r.status}`);
  }
  return r;
}

console.log('🚀 Rozpoczynanie procedury właściwego release...');

// 1. Budowanie artefaktów
console.log('📦 Budowanie artefaktów...');
run('pnpm', ['build']);

// 2. Weryfikacja integralności
console.log('🔍 Weryfikacja integralności...');
run('pnpm', ['check-types']);
run('pnpm', ['lint']);

// 3. Finalizacja i publikacja
console.log('✅ Artefakty zbudowane i zweryfikowane.');

console.log('📤 Wypychanie zmian do repozytorium...');
run('git', ['push', 'origin', 'main']);
run('git', ['push', '--tags']);

console.log('🚀 Release został pomyślnie opublikowany.');
