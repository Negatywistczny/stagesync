package com.stagesync.console

import android.util.Log

/**
 * JNI façade for nodejs-mobile (`libnode` + `stagesync-host-bridge`).
 * `isBridgeReady()` is true only after both shared libraries load.
 *
 * Load order matches JaneaSystems nodejs-mobile samples: `node` first, then
 * the bridge that links against it. Never call from the main thread for the
 * first load — `libnode.so` is tens of MB and can ANR / kill the process.
 *
 * Prefer calling only from the `:host` service process so a linker/V8 abort
 * cannot take down the launcher UI.
 */
object LocalHostNative {
    private const val TAG = "SsLocalHost"

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
            Log.e(TAG, "setEnv failed: $key", err)
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
            Log.e(TAG, "chdir failed: $path", err)
            false
        }
    }

    /**
     * Blocks until Node exits. Call from a dedicated background thread with a
     * large stack (nodejs-mobile / V8).
     * @return Node process exit code (0 = clean).
     */
    @JvmStatic
    fun startNodeWithArguments(arguments: Array<String>): Int {
        if (!ensureLoaded()) return 1
        return try {
            nativeStartNodeWithArguments(arguments)
        } catch (err: Throwable) {
            lastLoadError = err.message ?: err.javaClass.simpleName
            Log.e(TAG, "startNodeWithArguments threw", err)
            1
        }
    }

    @Synchronized
    private fun ensureLoaded(): Boolean {
        if (loadAttempted) return bridgeReady
        loadAttempted = true
        lastLoadError = null
        return try {
            Log.i(TAG, "loadLibrary(node)…")
            // Dependency first — OEM linkers do not always auto-resolve NEEDED.
            System.loadLibrary("node")
            Log.i(TAG, "loadLibrary(stagesync-host-bridge)…")
            System.loadLibrary("stagesync-host-bridge")
            bridgeReady = nativeIsBridgeReady()
            if (!bridgeReady) {
                lastLoadError = "nativeIsBridgeReady=false"
            }
            Log.i(TAG, "JNI bridge ready=$bridgeReady")
            bridgeReady
        } catch (err: UnsatisfiedLinkError) {
            bridgeReady = false
            lastLoadError = err.message ?: "UnsatisfiedLinkError"
            Log.e(TAG, "UnsatisfiedLinkError loading libnode/bridge", err)
            false
        } catch (err: Throwable) {
            bridgeReady = false
            lastLoadError = err.message ?: err.javaClass.simpleName
            Log.e(TAG, "failed loading libnode/bridge", err)
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
