#!/usr/bin/env node
/**
 * Zabija zalegające procesy StageSync / instalatory NSIS, które blokują
 * nadpisanie `*-setup.exe` przy `tauri build` (Windows: os error 5).
 */
import { spawnSync } from "node:child_process";

if (process.platform !== "win32") {
  process.exit(0);
}

console.log("[kill-zombies] Szukam zalegających procesów StageSync...");

const ps = `
$ErrorActionPreference = 'SilentlyContinue'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding
$killed = @()

# 1) Znane binarne nazwy shella / sidecara
foreach ($n in @('stagesync-desktop', 'stagesync-host', 'makensis')) {
  Get-Process -Name $n -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.Id -Force
    $killed += "$($_.ProcessName) ($($_.Id))"
  }
}

# 2) Instalatory: ProcessName zawiera StageSync + setup (Windows ucina nazwę, ale zwykle zostaje 'setup')
Get-Process -ErrorAction SilentlyContinue | Where-Object {
  $_.ProcessName -like 'StageSync*' -or $_.ProcessName -like '*setup*'
} | Where-Object {
  $_.ProcessName -match 'StageSync' -or ($_.Path -and $_.Path -match 'stagesync')
} | ForEach-Object {
  Stop-Process -Id $_.Id -Force
  $killed += "$($_.ProcessName) ($($_.Id))"
}

# 3) Po ścieżce: wszystko uruchomione z target/*/bundle/nsis/*.exe
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
  $_.ExecutablePath -and ($_.ExecutablePath -match '[\\\\/]stagesync[\\\\/].*[\\\\/]bundle[\\\\/]nsis[\\\\/].*\\.exe$')
} | ForEach-Object {
  Stop-Process -Id $_.ProcessId -Force
  $killed += "$($_.Name) ($($_.ProcessId))"
}

$killed = $killed | Select-Object -Unique
if ($killed.Count -gt 0) {
  [Console]::Out.WriteLine("[kill-zombies] Zamknięto: $($killed -join ', ')")
} else {
  [Console]::Out.WriteLine("[kill-zombies] Brak wiszących procesów.")
}
`;

// -EncodedCommand = UTF-16LE Base64 — omija mangling argv / codepage przy polskich znakach
const encoded = Buffer.from(ps, "utf16le").toString("base64");
const res = spawnSync(
  "powershell",
  ["-NoProfile", "-EncodedCommand", encoded],
  { encoding: "utf8" },
);
if (res.stdout) process.stdout.write(res.stdout);
if (res.stderr) process.stderr.write(res.stderr);
