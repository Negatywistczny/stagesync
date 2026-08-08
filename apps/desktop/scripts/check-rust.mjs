import { execSync } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';

const homeDir = os.homedir();
const isWin = os.platform() === 'win32';
const cargoPath = path.join(homeDir, '.cargo', 'bin', isWin ? 'cargo.exe' : 'cargo');

try {
  execSync('cargo --version', { stdio: 'ignore' });
  // Wszystko działa, wychodzimy z sukcesem
  process.exit(0);
} catch (e) {
  // Cargo nie ma w PATH

  if (fs.existsSync(cargoPath)) {
    console.error('\n⚠️ UWAGA: Rust JEST zainstalowany, ale Twój terminal o tym nie wie!');
    console.error('========================================================================');
    console.error('Instalator dodał Rusta do systemu, ale obecna sesja terminala posiada stare');
    console.error('zmienne środowiskowe PATH (sprzed instalacji).');
    console.error('\n👉 ZAMKNIJ TEN TERMINAL (ikonka kosza/krzyżyka) i OTWÓRZ NOWY.');
    console.error('👉 Lub zrestartuj cały edytor (VS Code / Cursor).');
    console.error('========================================================================\n');
  } else {
    console.error('\n⚠️ UWAGA: Brak środowiska Rust i Cargo!');
    console.error('========================================================================');
    console.error('Środowisko Tauri wymaga języka Rust do zbudowania warstwy desktopowej.');
    console.error('💡 ZALECENIE: Zamknij ten proces i uruchom skrypt walidacji środowiska w głównym folderze:');
    console.error(isWin ? '   .\\dev doctor  (or .\\scripts\\setup\\setup.ps1)' : '   ./dev doctor  (or ./scripts/setup/setup.sh)');
    console.error('💡 Możesz też zainstalować Rust ręcznie ze strony https://rustup.rs/');
    console.error('Rozpoczynam zautomatyzowaną instalację Rusta jako fallback...\n');

    try {
      if (isWin) {
        // Pobieramy instalator i uruchamiamy (pozwoli to użytkownikowi przejść przez kroki, np. doinstalować MSVC)
        execSync('curl -sSfL https://win.rustup.rs -o rustup-init.exe && rustup-init.exe', { stdio: 'inherit' });
      } else {
        execSync('curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y', { stdio: 'inherit' });
      }
      console.log('\n✅ Instalacja zakończona! ZAMKNIJ I OTWÓRZ PONOWNIE TERMINAL, aby odświeżyć zmienne PATH.');
    } catch (err) {
      console.error('\n❌ Automatyczna instalacja przerwana. Wejdź ręcznie na: https://rustup.rs/');
    }
    console.error('========================================================================\n');
  }

  // Usypiamy proces, omijając uruchomienie samego Tauri, ale nie wywalając kodu 1.
  // Pozwoli to reszcie środowiska monorepo (np. paczkom web czy server) działać poprawnie.
  console.error('Uruchamianie samej aplikacji desktopowej zostało wstrzymane (usypiam).');
  setInterval(() => { }, 1000 * 60 * 60);
}
