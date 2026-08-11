/**
 * LAN network info display with QR codes for performer clients.
 */

import * as os from "node:os";
import qrcode from "qrcode-terminal";
import { clack, pc, clearTerminalScreen, waitReturn } from "./utils.js";
import { managePortsAndZombies } from "./doctor.js";

// ── Types ───────────────────────────────────────────────────────────────────

export interface NICInfo {
  name: string;
  address: string;
}

// ── Network interfaces ──────────────────────────────────────────────────────

export function getNetworkInterfaces(): NICInfo[] {
  const interfaces = os.networkInterfaces();
  const list: NICInfo[] = [];

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        list.push({ name, address: net.address });
      }
    }
  }

  return list;
}

// ── LAN info display ────────────────────────────────────────────────────────

export async function showLANInfo() {
  const nics = getNetworkInterfaces();
  if (nics.length === 0) {
    clack.log.warn("Nie wykryto aktywnych połączeń w sieci lokalnej (LAN).");
    return;
  }

  let selectedIP = nics[0].address;

  if (nics.length > 1) {
    const choices = nics.map((nic) => ({
      value: nic.address,
      label: `${nic.name} — ${nic.address}`,
    }));

    const choice = await clack.select({
      message: "Wybierz kartę sieciową (NIC) do podglądu LAN:",
      options: choices,
    });

    if (!clack.isCancel(choice)) {
      selectedIP = choice as string;
    }
  }

  clack.log.info(
    pc.bold(pc.cyan("🌐 Dedykowane URLe w sieci lokalnej (LAN):")),
  );
  console.log(
    `   ${pc.bold("Localhost Admin UI")}:    ${pc.underline(pc.cyan("http://localhost:3000/admin"))}`,
  );
  console.log(
    `   ${pc.bold("Localhost Client UI")}:   ${pc.underline(pc.cyan("http://localhost:3000/client"))}`,
  );
  console.log(
    `   ${pc.bold("Localhost Server API")}:  ${pc.underline(pc.cyan("http://localhost:4000/api/health"))}`,
  );
  console.log();
  console.log(
    `   ${pc.bold("LAN Client (Performer)")}: ${pc.underline(pc.cyan(`http://${selectedIP}:3000/client`))}`,
  );
  console.log(
    `   ${pc.bold("LAN Admin UI")}:           ${pc.underline(pc.cyan(`http://${selectedIP}:3000/admin`))}`,
  );
  console.log(
    `   ${pc.bold("LAN Server API")}:         ${pc.underline(pc.cyan(`http://${selectedIP}:4000/api/health`))}`,
  );

  const clientURL = `http://${selectedIP}:3000/client`;
  console.log(
    `\n${pc.green(pc.bold("📱 Kod QR dla tabletów / telefonów (Performer Client):"))}`,
  );
  console.log(`   ${pc.underline(pc.cyan(clientURL))}\n`);
  qrcode.generate(clientURL, { small: true });
}

export async function menuNetwork() {
  clearTerminalScreen();
  const choice = await clack.select({
    message: "Sieć & Diagnostyka LAN:",
    options: [
      { value: "ip", label: "1. 📱  Podgląd LAN IP + Kod QR (z wyborem NIC)" },
      { value: "ports", label: "2. 🔌  Port Guard & Kill-Zombies" },
      { value: "back", label: "0. ↩️   Powrót" },
    ],
  });

  if (clack.isCancel(choice) || choice === "back") return;

  if (choice === "ip") {
    await showLANInfo();
    await waitReturn();
  } else if (choice === "ports") {
    await managePortsAndZombies();
    await waitReturn();
  }
}

