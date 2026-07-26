package com.stagesync.console

import android.Manifest
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.text.method.ScrollingMovementMethod
import android.util.Log
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.stagesync.console.databinding.ActivityLauncherBinding
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class LauncherActivity : AppCompatActivity() {
    private lateinit var binding: ActivityLauncherBinding
    private var mdns: MdnsBrowser? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var emptyScanRunnable: Runnable? = null
    private var lastHostCount = 0
    private var localHostBusy = false
    private var hostBound = false
    private var hostTerminal = false
    private var lastLocalHostError = ""
    private var localHostHasError = false
    private var statusPollRunnable: Runnable? = null

    private val hostDeathConnection =
        object : ServiceConnection {
            override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
                Log.i(TAG, "host process bound")
            }

            override fun onServiceDisconnected(name: ComponentName?) {
                Log.w(TAG, "host process disconnected")
                onHostProcessDied()
            }

            override fun onBindingDied(name: ComponentName?) {
                Log.w(TAG, "host binding died")
                onHostProcessDied()
            }

            override fun onNullBinding(name: ComponentName?) {
                // Binder is non-null; unused.
            }
        }

    private val qrLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            if (result.resultCode != RESULT_OK) return@registerForActivityResult
            val url = result.data?.getStringExtra(QrScanActivity.EXTRA_URL) ?: return@registerForActivityResult
            binding.urlInput.setText(url)
            connect(url)
        }

    private val cameraPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            openQrScanner(granted)
        }

    private val notificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {
            startLocalHost()
        }

    private val localHostReceiver =
        object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (intent == null) return
                when (intent.action) {
                    LocalHostService.ACTION_FAILED -> {
                        val message =
                            intent.getStringExtra(LocalHostService.EXTRA_MESSAGE)
                                ?: getString(R.string.err_health)
                        onLocalHostFailed(message)
                    }
                    LocalHostService.ACTION_READY -> {
                        val origin =
                            intent.getStringExtra(LocalHostService.EXTRA_ORIGIN)
                                ?: LocalHostRuntime.LOOPBACK_ORIGIN
                        onLocalHostReady(origin)
                    }
                }
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLauncherBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.localHostLog.movementMethod = ScrollingMovementMethod()
        binding.localHostLog.setOnTouchListener { v, event ->
            if (event.action == MotionEvent.ACTION_DOWN || event.action == MotionEvent.ACTION_MOVE) {
                v.parent?.requestDisallowInterceptTouchEvent(true)
            }
            false
        }
        binding.btnLocalHostClear.setOnClickListener { clearLocalHostError() }
        binding.btnLocalHostDownloadLog.setOnClickListener { shareLocalHostLog() }

        binding.btnConnect.setOnClickListener {
            connect(binding.urlInput.text?.toString().orEmpty())
        }
        binding.btnLocalHost.setOnClickListener { onLocalHostClicked() }
        binding.btnQr.setOnClickListener { startQr() }
        binding.btnRecent.setOnClickListener { showRecentDialog() }
        binding.status.setOnClickListener { startMdns() }

        val filter =
            IntentFilter().apply {
                addAction(LocalHostService.ACTION_FAILED)
                addAction(LocalHostService.ACTION_READY)
            }
        ContextCompat.registerReceiver(
            this,
            localHostReceiver,
            filter,
            ContextCompat.RECEIVER_NOT_EXPORTED,
        )

        startMdns()
    }

    override fun onDestroy() {
        cancelEmptyScanHint()
        stopStatusPoll()
        mdns?.stop()
        unbindHostWatch()
        try {
            unregisterReceiver(localHostReceiver)
        } catch (_: IllegalArgumentException) {
            // already unregistered
        }
        super.onDestroy()
    }

    private fun onLocalHostClicked() {
        if (localHostBusy) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted =
                ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS,
                ) == PackageManager.PERMISSION_GRANTED
            if (!granted) {
                notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
                return
            }
        }
        startLocalHost()
    }

    private fun startLocalHost() {
        setLocalHostBusy(true)
        hostTerminal = false
        LocalHostStatus.clear(this)
        showLocalHostProgress(getString(R.string.local_host_starting))
        startStatusPoll()
        try {
            bindHostWatch()
            LocalHostService.start(this)
        } catch (err: Throwable) {
            stopStatusPoll()
            unbindHostWatch()
            setLocalHostBusy(false)
            val message =
                getString(
                    R.string.local_host_start_failed,
                    err.message ?: err.javaClass.simpleName,
                )
            showLocalHostError(message)
            Toast.makeText(this, toastSummary(message), Toast.LENGTH_LONG).show()
        }
    }

    /**
     * Poll shared status written by `:host` — broadcasts often never arrive at a
     * dynamically registered RECEIVER_NOT_EXPORTED across process boundaries.
     */
    private fun startStatusPoll() {
        stopStatusPoll()
        val poll =
            object : Runnable {
                override fun run() {
                    if (!localHostBusy || hostTerminal) return
                    when (val snap = LocalHostStatus.read(this@LauncherActivity)) {
                        is LocalHostStatus.Snapshot.Ready -> onLocalHostReady(snap.origin)
                        is LocalHostStatus.Snapshot.Failed -> onLocalHostFailed(snap.message)
                        LocalHostStatus.Snapshot.None ->
                            mainHandler.postDelayed(this, STATUS_POLL_MS)
                    }
                }
            }
        statusPollRunnable = poll
        mainHandler.postDelayed(poll, STATUS_POLL_MS)
    }

    private fun stopStatusPoll() {
        statusPollRunnable?.let { mainHandler.removeCallbacks(it) }
        statusPollRunnable = null
    }

    private fun onLocalHostReady(origin: String) {
        if (hostTerminal) return
        hostTerminal = true
        stopStatusPoll()
        unbindHostWatch()
        setLocalHostBusy(false)
        clearLocalHostErrorUi(clearFiles = false)
        Log.i(TAG, "local host READY origin=$origin")
        connect(origin)
    }

    private fun onLocalHostFailed(message: String) {
        if (hostTerminal) return
        hostTerminal = true
        stopStatusPoll()
        unbindHostWatch()
        setLocalHostBusy(false)
        showLocalHostError(message)
        Toast.makeText(this, toastSummary(message), Toast.LENGTH_LONG).show()
    }

    private fun bindHostWatch() {
        if (hostBound) return
        val intent = Intent(this, LocalHostService::class.java)
        hostBound =
            bindService(
                intent,
                hostDeathConnection,
                Context.BIND_AUTO_CREATE or Context.BIND_IMPORTANT,
            )
        Log.i(TAG, "bindHostWatch bound=$hostBound")
    }

    private fun unbindHostWatch() {
        if (!hostBound) return
        try {
            unbindService(hostDeathConnection)
        } catch (_: Throwable) {
            // already unbound
        }
        hostBound = false
    }

    private fun onHostProcessDied() {
        hostBound = false
        if (hostTerminal || !localHostBusy) return
        // Prefer a FAILED status written just before process death.
        when (val snap = LocalHostStatus.read(this)) {
            is LocalHostStatus.Snapshot.Failed -> {
                onLocalHostFailed(snap.message)
                return
            }
            is LocalHostStatus.Snapshot.Ready -> {
                onLocalHostReady(snap.origin)
                return
            }
            LocalHostStatus.Snapshot.None -> Unit
        }
        hostTerminal = true
        stopStatusPoll()
        val message = LocalHostRuntime.processDiedMessage(this)
        Log.e(TAG, HostProcessLog.appendDiagnostics(this, message))
        setLocalHostBusy(false)
        showLocalHostError(message)
        Toast.makeText(this, toastSummary(message), Toast.LENGTH_LONG).show()
    }

    private fun showLocalHostProgress(message: String) {
        localHostHasError = false
        lastLocalHostError = ""
        binding.localHostStatus.visibility = View.VISIBLE
        binding.localHostStatus.setTextColor(ContextCompat.getColor(this, R.color.ss_muted))
        binding.localHostStatus.text = message
        binding.localHostLog.visibility = View.GONE
        binding.localHostLog.text = ""
        syncLocalHostErrorActions()
    }

    private fun showLocalHostError(message: String) {
        localHostHasError = true
        lastLocalHostError = message.trim()
        binding.localHostStatus.visibility = View.VISIBLE
        binding.localHostStatus.setTextColor(ContextCompat.getColor(this, R.color.ss_danger))
        binding.localHostStatus.text = lastLocalHostError
        val panel = HostProcessLog.panelText(this)
        if (panel.isNotBlank()) {
            binding.localHostLog.visibility = View.VISIBLE
            binding.localHostLog.text = panel
            binding.localHostLog.scrollTo(0, 0)
        } else {
            binding.localHostLog.visibility = View.GONE
            binding.localHostLog.text = ""
        }
        syncLocalHostErrorActions()
    }

    private fun clearLocalHostError() {
        HostProcessLog.clear(this)
        clearLocalHostErrorUi(clearFiles = false)
    }

    private fun clearLocalHostErrorUi(clearFiles: Boolean) {
        if (clearFiles) HostProcessLog.clear(this)
        localHostHasError = false
        lastLocalHostError = ""
        binding.localHostStatus.visibility = View.GONE
        binding.localHostStatus.text = ""
        binding.localHostStatus.setTextColor(ContextCompat.getColor(this, R.color.ss_muted))
        binding.localHostLog.visibility = View.GONE
        binding.localHostLog.text = ""
        syncLocalHostErrorActions()
    }

    private fun syncLocalHostErrorActions() {
        val hasLog =
            HostProcessLog.hasPanelContent(this) ||
                binding.localHostLog.text?.isNotBlank() == true
        val vis =
            LocalHostErrorActions.visibility(
                hasError = localHostHasError,
                hasLog = hasLog,
            )
        binding.localHostErrorActions.visibility = if (vis.showRow) View.VISIBLE else View.GONE
        binding.btnLocalHostClear.visibility = if (vis.showClear) View.VISIBLE else View.GONE
        binding.btnLocalHostDownloadLog.visibility =
            if (vis.showDownload) View.VISIBLE else View.GONE
    }

    private fun shareLocalHostLog() {
        val export = HostProcessLog.buildExport(this, lastLocalHostError).trim()
        if (export.isEmpty()) {
            Toast.makeText(this, R.string.local_host_log_empty, Toast.LENGTH_SHORT).show()
            return
        }
        val stamp =
            SimpleDateFormat("yyyy-MM-dd'T'HH-mm-ss", Locale.US)
                .apply { timeZone = TimeZone.getTimeZone("UTC") }
                .format(Date())
        val file = File(cacheDir, "stagesync-host-$stamp.log")
        file.writeText("$export\n")
        val uri =
            FileProvider.getUriForFile(
                this,
                "$packageName.fileprovider",
                file,
            )
        val send =
            Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, getString(R.string.local_host_share_log))
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
        startActivity(Intent.createChooser(send, getString(R.string.local_host_share_log)))
    }

    private fun toastSummary(message: String): String {
        val first = message.lineSequence().firstOrNull()?.trim().orEmpty()
        return if (first.length <= 160) first else first.take(157) + "…"
    }

    private fun setLocalHostBusy(busy: Boolean) {
        localHostBusy = busy
        binding.btnLocalHost.isEnabled = !busy
        binding.btnLocalHost.isClickable = !busy
        binding.btnLocalHost.alpha = if (busy) 0.6f else 1f
        binding.btnLocalHost.text =
            getString(if (busy) R.string.btn_local_host_busy else R.string.btn_local_host)
        binding.btnLocalHost.contentDescription =
            getString(if (busy) R.string.btn_local_host_busy else R.string.btn_local_host)
    }

    private fun startQr() {
        when {
            ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED -> openQrScanner(true)
            else ->
                AlertDialog.Builder(this)
                    .setTitle(R.string.camera_permission_title)
                    .setMessage(R.string.camera_permission_rationale)
                    .setPositiveButton(R.string.camera_permission_allow) { _, _ ->
                        cameraPermission.launch(Manifest.permission.CAMERA)
                    }
                    .setNegativeButton(R.string.camera_permission_paste) { _, _ ->
                        openQrScanner(false)
                    }
                    .show()
        }
    }

    private fun openQrScanner(cameraGranted: Boolean) {
        qrLauncher.launch(
            Intent(this, QrScanActivity::class.java)
                .putExtra(QrScanActivity.EXTRA_CAMERA, cameraGranted),
        )
    }

    private fun startMdns() {
        cancelEmptyScanHint()
        lastHostCount = 0
        binding.status.setText(R.string.status_scanning)
        binding.mdnsList.removeAllViews()
        if (mdns == null) mdns = MdnsBrowser(this)
        mdns?.start { hosts ->
            lastHostCount = hosts.size
            binding.mdnsList.removeAllViews()
            if (hosts.isEmpty()) {
                binding.status.setText(R.string.status_none)
                return@start
            }
            cancelEmptyScanHint()
            binding.status.text = getString(R.string.status_found, hosts.size)
            hosts.forEach { host ->
                binding.mdnsList.addView(hostCard(host.name, host.origin))
            }
        }
        val hint =
            Runnable {
                if (lastHostCount == 0 && binding.mdnsList.childCount == 0) {
                    binding.status.setText(R.string.status_none)
                }
            }
        emptyScanRunnable = hint
        mainHandler.postDelayed(hint, 4_000L)
    }

    private fun cancelEmptyScanHint() {
        emptyScanRunnable?.let { mainHandler.removeCallbacks(it) }
        emptyScanRunnable = null
    }

    private fun showRecentDialog() {
        val recent = RecentHosts.load(this)
        if (recent.isEmpty()) {
            Toast.makeText(this, R.string.recent_empty, Toast.LENGTH_SHORT).show()
            return
        }
        AlertDialog.Builder(this)
            .setTitle(R.string.recent_dialog_title)
            .setItems(recent.toTypedArray()) { _, which ->
                val origin = recent[which]
                binding.urlInput.setText(origin)
                connect(origin)
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    private fun hostCard(name: String, origin: String): View {
        val card =
            LayoutInflater.from(this).inflate(R.layout.item_host_card, binding.mdnsList, false)
        card.findViewById<TextView>(R.id.hostName).text = name
        card.findViewById<TextView>(R.id.hostOrigin).text = displayOrigin(origin)
        card.setOnClickListener {
            binding.urlInput.setText(origin)
            connect(origin)
        }
        val lp =
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT,
            )
        lp.bottomMargin = (8 * resources.displayMetrics.density).toInt()
        card.layoutParams = lp
        return card
    }

    private fun displayOrigin(origin: String): String =
        origin.removePrefix("http://").removePrefix("https://")

    private fun connect(raw: String) {
        val origin = RecentHosts.normalizeOrigin(raw)
        if (origin == null) {
            binding.status.setText(R.string.err_bad_url)
            return
        }
        binding.status.setText(R.string.status_probing)
        binding.btnConnect.isEnabled = false
        HealthProbe.probe(origin) { ok, _ ->
            runOnUiThread {
                binding.btnConnect.isEnabled = true
                if (!ok) {
                    binding.status.setText(R.string.err_health)
                    Toast.makeText(this, R.string.err_health, Toast.LENGTH_SHORT).show()
                    return@runOnUiThread
                }
                RecentHosts.push(this, origin)
                binding.status.setText(R.string.status_ok)
                startActivity(
                    Intent(this, HostWebActivity::class.java).putExtra(
                        HostWebActivity.EXTRA_ORIGIN,
                        origin,
                    ),
                )
            }
        }
    }

    companion object {
        private const val TAG = "SsLocalHost"
        private const val STATUS_POLL_MS = 350L
    }
}
