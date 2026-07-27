package com.stagesync.console

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.os.Handler
import android.os.Looper

/**
 * Browse `_stagesync._tcp` on LAN (same service type as desktop launcher / server advertise).
 * Resolve → host list for the launcher UI (title + meta from TXT).
 */
class MdnsBrowser(context: Context) {
    private val nsd = context.getSystemService(Context.NSD_SERVICE) as NsdManager
    private val main = Handler(Looper.getMainLooper())
    private var discoveryListener: NsdManager.DiscoveryListener? = null
    private val resolving = mutableSetOf<String>()

    fun start(onUpdate: (List<HostDiscovery.Host>) -> Unit) {
        stop()
        val found = linkedMapOf<String, HostDiscovery.Host>()
        val listener = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(serviceType: String) {}
            override fun onDiscoveryStopped(serviceType: String) {}
            override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
                main.post { onUpdate(emptyList()) }
            }
            override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {}
            override fun onServiceLost(serviceInfo: NsdServiceInfo) {
                found.remove(serviceInfo.serviceName)
                main.post { onUpdate(found.values.toList()) }
            }
            override fun onServiceFound(serviceInfo: NsdServiceInfo) {
                if (resolving.contains(serviceInfo.serviceName)) return
                resolving.add(serviceInfo.serviceName)
                nsd.resolveService(
                    serviceInfo,
                    object : NsdManager.ResolveListener {
                        override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                            resolving.remove(serviceInfo.serviceName)
                        }
                        override fun onServiceResolved(resolved: NsdServiceInfo) {
                            resolving.remove(resolved.serviceName)
                            val host = resolved.host?.hostAddress ?: return
                            val port = if (resolved.port > 0) resolved.port else 4000
                            val origin = "http://$host:$port"
                            val attrs = resolved.attributes
                            val hostname = HostDiscovery.txtAttribute(attrs, "hostname")
                            val version = HostDiscovery.txtAttribute(attrs, "version")
                            val project = HostDiscovery.txtAttribute(attrs, "project")
                            val title =
                                HostDiscovery.formatDiscoveryTitle(
                                    hostname,
                                    origin,
                                    resolved.serviceName,
                                )
                            val meta =
                                HostDiscovery.formatDiscoveryMeta(origin, version, project)
                            found[resolved.serviceName] =
                                HostDiscovery.Host(
                                    title = title,
                                    meta = meta,
                                    origin = origin,
                                )
                            main.post { onUpdate(found.values.toList()) }
                        }
                    },
                )
            }
        }
        discoveryListener = listener
        nsd.discoverServices(ShellConfig.MDNS_TYPE, NsdManager.PROTOCOL_DNS_SD, listener)
    }

    fun stop() {
        discoveryListener?.let {
            runCatching { nsd.stopServiceDiscovery(it) }
        }
        discoveryListener = null
        resolving.clear()
    }
}
