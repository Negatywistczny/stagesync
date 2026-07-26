package com.stagesync.console

import android.content.Context
import android.system.Os
import android.system.OsConstants

/**
 * Lokalny host runtime probe (Termux-free path).
 *
 * Desktop packs Node as Tauri externalBin (`stagesync-host`). Android uses
 * nodejs-mobile `libnode.so` + JNI (`stagesync-host-bridge`) + `assets/host`.
 * Start attempts without a complete pack fail open — never fake success.
 */
object LocalHostRuntime {
    const val LOOPBACK_ORIGIN = "http://127.0.0.1:4000"
    const val NATIVE_LIB = "node"
    const val BRIDGE_LIB = "stagesync-host-bridge"
    const val HOST_ASSET_MARKER = "host/READY"
    const val HEALTH_PATH = "/api/health"
    const val DEFAULT_PORT = 4000

    data class Readiness(
        val nativeLibPresent: Boolean,
        val hostAssetsPresent: Boolean,
        val jniBridgeLoaded: Boolean,
        val loadDetail: String? = null,
    ) {
        val canStart: Boolean
            get() = nativeLibPresent && hostAssetsPresent && jniBridgeLoaded
    }

    /** Device page size in bytes, or -1 if unavailable. */
    fun devicePageSize(): Long =
        try {
            Os.sysconf(OsConstants._SC_PAGE_SIZE)
        } catch (_: Throwable) {
            -1L
        }

    fun libnodePtLoadAlign(context: Context): Long =
        ElfLoadAlign.libnodeAlign(context.applicationInfo.nativeLibraryDir)

    /**
     * True when the kernel uses ≥16 KB pages but packed `libnode.so` ELF
     * segments are still aligned below 16 KB (classic stock nodejs-mobile zip).
     */
    fun isPageAlignMismatch(context: Context): Boolean {
        val page = devicePageSize()
        val align = libnodePtLoadAlign(context)
        return page >= ElfLoadAlign.ALIGN_16K &&
            align > 0L &&
            align < ElfLoadAlign.ALIGN_16K
    }

    /**
     * Polish hint after `:host` death or failed dlopen — prefers proven
     * page-size mismatch over a generic “Node crashed” string, then appends
     * host stdio / boot-phase diagnostics when present.
     */
    fun processDiedMessage(context: Context): String {
        val page = devicePageSize()
        val align = libnodePtLoadAlign(context)
        val base =
            when {
                isPageAlignMismatch(context) ->
                    "Lokalny host padł przy ładowaniu libnode: urządzenie ma stronę pamięci " +
                        "${page} B, a libnode.so w APK ma wyrównanie ELF ${align} B (<16 KB). " +
                        "Przebuduj Console z prepare-local-host (domyślny zip digidem 16 KB) " +
                        "albo połącz się z hostem LAN. Logcat: SsLocalHost."
                page >= ElfLoadAlign.ALIGN_16K && align >= ElfLoadAlign.ALIGN_16K ->
                    "Proces lokalnego hosta zakończył się awaryjnie (silnik Node), mimo libnode " +
                        "wyrównanego do 16 KB. Launcher działa dalej — połącz się z hostem LAN " +
                        "albo sprawdź logcat tag SsLocalHost."
                else ->
                    "Proces lokalnego hosta zakończył się awaryjnie (silnik Node). Launcher działa " +
                        "dalej — połącz się z hostem LAN albo sprawdź logcat tag SsLocalHost."
            }
        return HostProcessLog.appendDiagnostics(context, base)
    }

    /**
     * File / asset presence only — does **not** call [System.loadLibrary].
     * Safe on the main thread.
     */
    fun probePack(context: Context): Readiness {
        val nativeDir = context.applicationInfo.nativeLibraryDir
        val libNode = java.io.File(nativeDir, "lib$NATIVE_LIB.so")
        val libBridge = java.io.File(nativeDir, "lib$BRIDGE_LIB.so")
        val nativeLibPresent =
            libNode.isFile &&
                libNode.length() > 0L &&
                libBridge.isFile &&
                libBridge.length() > 0L

        val hostAssetsPresent =
            try {
                context.assets.open(HOST_ASSET_MARKER).use { true }
            } catch (_: Exception) {
                false
            }

        return Readiness(
            nativeLibPresent = nativeLibPresent,
            hostAssetsPresent = hostAssetsPresent,
            jniBridgeLoaded = false,
        )
    }

    /**
     * Full readiness including JNI load. Call off the main thread —
     * loading `libnode.so` (~50 MB) can stall or OOM the UI thread.
     */
    fun probe(context: Context): Readiness {
        val pack = probePack(context)
        if (!pack.nativeLibPresent || !pack.hostAssetsPresent) {
            return pack
        }

        val jniBridgeLoaded = LocalHostNative.isBridgeReady()
        return pack.copy(
            jniBridgeLoaded = jniBridgeLoaded,
            loadDetail = if (!jniBridgeLoaded) LocalHostNative.loadErrorMessage() else null,
        )
    }

    fun missingMessage(readiness: Readiness, context: Context? = null): String {
        val missing = buildList {
            if (!readiness.nativeLibPresent) {
                add("brak libnode.so / stagesync-host-bridge w APK")
            }
            if (!readiness.hostAssetsPresent) {
                add("brak paczki serwera (assets/host)")
            }
            if (readiness.nativeLibPresent && !readiness.jniBridgeLoaded) {
                val detail = readiness.loadDetail?.takeIf { it.isNotBlank() }
                if (detail != null) {
                    add("most JNI nie załadował się: $detail")
                } else {
                    add("most JNI nie załadował się (NDK / libnode)")
                }
            }
        }
        return buildString {
            append("Lokalny host nie jest gotowy w tym buildzie")
            if (missing.isNotEmpty()) {
                append(": ")
                append(missing.joinToString("; "))
            }
            append(". Połącz się z hostem LAN albo przebuduj Console APK (`prepare-local-host` + NDK) — docs/MOBILE.md.")
            if (context != null && isPageAlignMismatch(context)) {
                val page = devicePageSize()
                val align = libnodePtLoadAlign(context)
                append(
                    " Wykryto niezgodność 16 KB: pageSize=${page}, libnode PT_LOAD align=${align}.",
                )
            }
        }
    }
}
