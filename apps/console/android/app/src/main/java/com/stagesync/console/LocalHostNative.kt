package com.stagesync.console

/**
 * JNI façade for nodejs-mobile (`libnode` + `stagesync-host-bridge`).
 * `isBridgeReady()` is true only after both shared libraries load.
 */
object LocalHostNative {
    @Volatile
    private var loadAttempted = false

    @Volatile
    private var bridgeReady = false

    @JvmStatic
    fun isBridgeReady(): Boolean {
        ensureLoaded()
        return bridgeReady
    }

    @JvmStatic
    fun setEnv(key: String, value: String): Boolean {
        if (!ensureLoaded()) return false
        return nativeSetEnv(key, value)
    }

    @JvmStatic
    fun chdir(path: String): Boolean {
        if (!ensureLoaded()) return false
        return nativeChdir(path)
    }

    /**
     * Blocks until Node exits. Call from a dedicated background thread.
     * @return Node process exit code (0 = clean).
     */
    @JvmStatic
    fun startNodeWithArguments(arguments: Array<String>): Int {
        if (!ensureLoaded()) return 1
        return nativeStartNodeWithArguments(arguments)
    }

    @Synchronized
    private fun ensureLoaded(): Boolean {
        if (loadAttempted) return bridgeReady
        loadAttempted = true
        return try {
            System.loadLibrary("stagesync-host-bridge")
            System.loadLibrary("node")
            bridgeReady = nativeIsBridgeReady()
            bridgeReady
        } catch (_: UnsatisfiedLinkError) {
            bridgeReady = false
            false
        } catch (_: Throwable) {
            bridgeReady = false
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
