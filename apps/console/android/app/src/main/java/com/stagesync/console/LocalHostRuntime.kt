package com.stagesync.console

/**
 * Faza 4 — lokalny host runtime probe (Termux-free path).
 *
 * Desktop packs Node as Tauri externalBin (`stagesync-host`). Android has no
 * official Node dist; the intended eng path is nodejs-mobile `libnode.so` + JNI
 * (see docs/MOBILE.md). Until that bridge + server assets ship in the APK, start
 * attempts fail open with an honest operator message — never fake success.
 */
object LocalHostRuntime {
    const val LOOPBACK_ORIGIN = "http://127.0.0.1:4000"
    const val NATIVE_LIB = "node"
    const val HOST_ASSET_MARKER = "host/READY"

    data class Readiness(
        val nativeLibPresent: Boolean,
        val hostAssetsPresent: Boolean,
        val jniBridgeLoaded: Boolean,
    ) {
        val canStart: Boolean
            get() = nativeLibPresent && hostAssetsPresent && jniBridgeLoaded
    }

    fun probe(context: android.content.Context): Readiness {
        val nativeDir = context.applicationInfo.nativeLibraryDir
        val libFile = java.io.File(nativeDir, "lib$NATIVE_LIB.so")
        val nativeLibPresent = libFile.isFile && libFile.length() > 0L

        val hostAssetsPresent =
            try {
                context.assets.open(HOST_ASSET_MARKER).use { true }
            } catch (_: Exception) {
                false
            }

        var jniBridgeLoaded = false
        if (nativeLibPresent) {
            try {
                System.loadLibrary(NATIVE_LIB)
                // Placeholder: real bridge exposes startNodeWithArguments via JNI.
                jniBridgeLoaded = LocalHostNative.isBridgeReady()
            } catch (_: UnsatisfiedLinkError) {
                jniBridgeLoaded = false
            } catch (_: Throwable) {
                jniBridgeLoaded = false
            }
        }

        return Readiness(
            nativeLibPresent = nativeLibPresent,
            hostAssetsPresent = hostAssetsPresent,
            jniBridgeLoaded = jniBridgeLoaded,
        )
    }

    fun missingMessage(readiness: Readiness): String {
        val missing = buildList {
            if (!readiness.nativeLibPresent) {
                add("brak libnode.so (nodejs-mobile) w jniLibs")
            }
            if (!readiness.hostAssetsPresent) {
                add("brak paczki serwera (assets/host)")
            }
            if (readiness.nativeLibPresent && !readiness.jniBridgeLoaded) {
                add("brak mostu JNI (NDK) do node::Start")
            }
        }
        return buildString {
            append("Lokalny host nie jest jeszcze gotowy w tym buildzie")
            if (missing.isNotEmpty()) {
                append(": ")
                append(missing.joinToString("; "))
            }
            append(". Połącz się z hostem LAN albo zbuduj APK po `prepare-local-host` + NDK — docs/MOBILE.md Faza 4.")
        }
    }
}

/**
 * JNI façade — real implementation lands with NDK cmake (`startNodeWithArguments`).
 * Default stub reports bridge not ready so UI stays fail-open.
 */
object LocalHostNative {
    @JvmStatic
    fun isBridgeReady(): Boolean = false
}
