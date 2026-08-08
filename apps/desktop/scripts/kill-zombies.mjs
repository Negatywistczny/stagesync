#!/usr/bin/env node
/**
 * Zabija zalegające procesy (stagesync-desktop, stagesync-host), 
 * które często blokują pliki .exe przy kompilacji w Tauri na systemie Windows.
 */
import { spawnSync } from "node:child_process";

if (process.platform === "win32") {
  console.log("[kill-zombies] Szukam zalegających procesów StageSync...");
  const processesToKill = ["stagesync-desktop", "stagesync-host"];
  
  for (const procName of processesToKill) {
    const res = spawnSync("powershell", [
      "-NoProfile",
      "-Command",
      `Stop-Process -Name "${procName}" -Force -ErrorAction SilentlyContinue`
    ]);
    
    // Kod wyjścia 0 oznacza, że pomyślnie zabił proces.
    if (res.status === 0) {
      console.log(`[kill-zombies] Zabrano uprawnienia/zabito zacięty proces: ${procName}.exe`);
    }
  }
}
