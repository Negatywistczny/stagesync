package com.stagesync.console

/**
 * JNI façade for nodejs-mobile (`libnode` + `stagesync-host-bridge`).
 * `isBridgeReady()` is true only after both shared libraries load.
 *
 * Load order matches JaneaSystems nodejs-mobile samples: `node` first, then
 * the bridge that links against it. Never call from the main thread for the
 * first load — `libnode.so` is tens of MB and can ANR / kill the process.
 */
object LocalHostNative {
    @Volatile
    private var loadAttempted = false

    @Volatile
    private var bridgeReady = false

    @Volatile
    private var lastLoadError: String? = null

    @JvmStatic
    fun lastError(): String? = lastLoadError

    /** Alias used by [LocalHostRuntime] readiness messages. */
    @JvmStatic
    fun loadErrorMessage(): String? = lastLoadError

    @JvmStatic
    fun isBridgeReady(): Boolean {
        ensureLoaded()
        return bridgeReady
    }

    @JvmStatic
    fun setEnv(key: String, value: String): Boolean {
        if (!ensureLoaded()) return false
        return try {
            nativeSetEnv(key, value)
        } catch (err: Throwable) {
            lastLoadError = err.message ?: err.javaClass.simpleName
            false
        }
    }

    @JvmStatic
    fun chdir(path: String): Boolean {
        if (!ensureLoaded()) return false
        return try {
            nativeChdir(path)
        } catch (err: Throwable) {
            lastLoadError = err.message ?: err.javaClass.simpleName
            false
        }
    }

    /**
     * Blocks until Node exits. Call from a dedicated background thread.
     * @return Node process exit code (0 = clean).
     */
    @JvmStatic
    fun startNodeWithArguments(arguments: Array<String>): Int {
        if (!ensureLoaded()) return 1
        return try {
            nativeStartNodeWithArguments(arguments)
        } catch (err: Throwable) {
            lastLoadError = err.message ?: err.javaClass.simpleName
            1
        }
    }

    @Synchronized
    private fun ensureLoaded(): Boolean {
        if (loadAttempted) return bridgeReady
        loadAttempted = true
        lastLoadError = null
        return try {
            // Dependency first — OEM linkers do not always auto-resolve NEEDED.
            System.loadLibrary("node")
            System.loadLibrary("stagesync-host-bridge")
            bridgeReady = nativeIsBridgeReady()
            if (!bridgeReady) {
                lastLoadError = "nativeIsBridgeReady=false"
            }
            bridgeReady
        } catch (err: UnsatisfiedLinkError) {
            bridgeReady = false
            lastLoadError = err.message ?: "UnsatisfiedLinkError"
            false
        } catch (err: Throwable) {
            bridgeReady = false
            lastLoadError = err.message ?: err.javaClass.simpleName
            false
        }
    }

    @JvmStatic
    private external fun nativeIsBridgeReady(): Boolean

    @JvmStatic
    private external fun nativeSetEnv(key: String, value: String): Boolean

    @JvmStatic
    private external fun nativeChdir(path: String): Boolean

    @JvmStatic
    private external fun nativeStartNodeWithArguments(arguments: Array<String>): Int
}
