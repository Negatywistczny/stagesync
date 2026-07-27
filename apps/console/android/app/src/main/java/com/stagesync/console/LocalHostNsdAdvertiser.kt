package com.stagesync.console

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Advertise `_stagesync._tcp` via Android [NsdManager] while the local host runs.
 *
 * Node `bonjour-service` is unreliable under nodejs-mobile (multicast / sandbox), so
 * [LocalHostService] keeps `STAGESYNC_DISABLE_MDNS=1` and relies on this platform
 * advertiser instead. Launchers (Console / Performer / desktop) already browse the
 * same service type.
 */
class LocalHostNsdAdvertiser(
    context: Context,
) {
    private val appContext = context.applicationContext
    private val main = Handler(Looper.getMainLooper())
    private val nsd = appContext.getSystemService(Context.NSD_SERVICE) as NsdManager
    private val started = AtomicBoolean(false)

    @Volatile
    private var registrationListener: NsdManager.RegistrationListener? = null

    @Volatile
    private var multicastLock: WifiManager.MulticastLock? = null

    fun start(
        port: Int,
        version: String,
        hostname: String = resolveDeviceHostname(appContext),
    ) {
        main.post {
            if (!started.compareAndSet(false, true)) {
                Log.i(TAG, "NSD already registered — skip")
                return@post
            }
            acquireMulticastLock()
            val info =
                NsdServiceInfo().apply {
                    serviceName = LocalHostNsdTxt.serviceName()
                    serviceType = ShellConfig.MDNS_TYPE
                    setPort(port)
                    for ((key, value) in LocalHostNsdTxt.buildAttributes(hostname, version)) {
                        // NsdServiceInfo attributes: key ≤ 9 bytes on older API; keep short keys.
                        setAttribute(key, value)
                    }
                }
            val listener =
                object : NsdManager.RegistrationListener {
                    override fun onServiceRegistered(serviceInfo: NsdServiceInfo) {
                        Log.i(
                            TAG,
                            "NSD registered name=${serviceInfo.serviceName} " +
                                "type=${serviceInfo.serviceType} port=$port",
                        )
                    }

                    override fun onRegistrationFailed(
                        serviceInfo: NsdServiceInfo,
                        errorCode: Int,
                    ) {
                        Log.e(TAG, "NSD registration failed code=$errorCode")
                        started.set(false)
                        releaseMulticastLock()
                        registrationListener = null
                    }

                    override fun onServiceUnregistered(serviceInfo: NsdServiceInfo) {
                        Log.i(TAG, "NSD unregistered name=${serviceInfo.serviceName}")
                    }

                    override fun onUnregistrationFailed(
                        serviceInfo: NsdServiceInfo,
                        errorCode: Int,
                    ) {
                        Log.w(TAG, "NSD unregistration failed code=$errorCode")
                    }
                }
            registrationListener = listener
            try {
                nsd.registerService(info, NsdManager.PROTOCOL_DNS_SD, listener)
                Log.i(
                    TAG,
                    "NSD register requested type=${ShellConfig.MDNS_TYPE} " +
                        "name=${info.serviceName} port=$port host=$hostname",
                )
            } catch (err: Throwable) {
                Log.e(TAG, "NSD registerService threw", err)
                started.set(false)
                registrationListener = null
                releaseMulticastLock()
            }
        }
    }

    fun stop() {
        main.post {
            val listener = registrationListener
            registrationListener = null
            if (listener != null) {
                runCatching { nsd.unregisterService(listener) }
                    .onFailure { Log.w(TAG, "NSD unregister failed", it) }
            }
            started.set(false)
            releaseMulticastLock()
        }
    }

    private fun acquireMulticastLock() {
        if (multicastLock?.isHeld == true) return
        try {
            val wifi = appContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            val lock =
                wifi?.createMulticastLock("stagesync-mdns")?.apply {
                    setReferenceCounted(false)
                    acquire()
                }
            multicastLock = lock
            if (lock != null) {
                Log.i(TAG, "WifiMulticastLock acquired")
            } else {
                Log.w(TAG, "WifiMulticastLock unavailable")
            }
        } catch (err: Throwable) {
            Log.w(TAG, "WifiMulticastLock acquire failed", err)
            multicastLock = null
        }
    }

    private fun releaseMulticastLock() {
        val lock = multicastLock ?: return
        multicastLock = null
        try {
            if (lock.isHeld) lock.release()
            Log.i(TAG, "WifiMulticastLock released")
        } catch (err: Throwable) {
            Log.w(TAG, "WifiMulticastLock release failed", err)
        }
    }

    companion object {
        private const val TAG = "SsLocalHostNsd"

        fun resolveDeviceHostname(context: Context): String {
            try {
                val deviceName =
                    Settings.Global.getString(context.contentResolver, Settings.Global.DEVICE_NAME)
                if (!deviceName.isNullOrBlank()) {
                    return LocalHostNsdTxt.normalizeHostname(deviceName)
                }
            } catch (_: Throwable) {
                // ignore — fall through
            }
            return LocalHostNsdTxt.normalizeHostname(android.os.Build.MODEL)
        }
    }
}
