// GUI app — never allocate an extra console window on Windows (incl. debug smoke builds).
#![windows_subsystem = "windows"]

fn main() {
    stagesync_desktop_lib::run();
}
