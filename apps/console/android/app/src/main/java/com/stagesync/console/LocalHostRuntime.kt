package com.stagesync.console

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

    /**
     * File / asset presence only — does **not** call [System.loadLibrary].
     * Safe on the main thread.
     */
    fun probePack(context: android.content.Context): Readiness {
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
    fun probe(context: android.content.Context): Readiness {
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

    fun missingMessage(readiness: Readiness): String {
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
            append(". Połącz się z hostem LAN albo przebuduj Console APK (`prepare-local-host` + NDK) — docs/MOBILE.md. Na Android 15+ z 16 KB pages stock libnode może nie wystartować.")
        }
    }
}
