package com.stagesync.console

import android.Manifest
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.graphics.Rect
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
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
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
    /** Non-null when status/health says local host is already READY — button offers Connect. */
    private var readyLocalOrigin: String? = null
    private var hostBound = false
    private var hostTerminal = false
    private var lastLocalHostError = ""
    private var localHostHasError = false
    private var statusPollRunnable: Runnable? = null
    private var offerProbeToken = 0
    private var releaseUpdateDialogShown = false
    private var releaseUpdateCheckStarted = false
    private var pendingApkFile: java.io.File? = null

    private val unknownSourcesLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
            val file = pendingApkFile
            if (file != null && ApkInstaller.canInstallPackages(this)) {
                startActivity(ApkInstaller.installIntent(this, file))
            } else if (file != null) {
                Toast.makeText(this, R.string.update_need_permission, Toast.LENGTH_LONG).show()
            }
            pendingApkFile = null
        }

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
                    LocalHostService.ACTION_STOPPED -> onLocalHostStopped()
                }
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLauncherBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupImeInsets()

        binding.localHostLog.movementMethod = ScrollingMovementMethod()
        binding.localHostLog.setOnTouchListener { v, event ->
            if (event.action == MotionEvent.ACTION_DOWN || event.action == MotionEvent.ACTION_MOVE) {
                v.parent?.requestDisallowInterceptTouchEvent(true)
            }
            false
        }
        binding.btnLocalHostClear.setOnClickListener { clearLocalHostError() }
        binding.btnLocalHostDiagnosticLog.setOnClickListener { shareLocalHostLog() }
        binding.btnHeaderDownloadLog.setOnClickListener { shareLocalHostLog() }

        binding.btnConnect.setOnClickListener {
            connect(binding.urlInput.text?.toString().orEmpty())
        }
        binding.btnLocalHost.setOnClickListener { onLocalHostClicked() }
        binding.btnQr.setOnClickListener { startQr() }
        binding.btnRecent.setOnClickListener { showRecentDialog() }
        binding.btnRefresh.setOnClickListener { startMdns() }

        val filter =
            IntentFilter().apply {
                addAction(LocalHostService.ACTION_FAILED)
                addAction(LocalHostService.ACTION_READY)
                addAction(LocalHostService.ACTION_STOPPED)
            }
        ContextCompat.registerReceiver(
            this,
            localHostReceiver,
            filter,
            ContextCompat.RECEIVER_NOT_EXPORTED,
        )

        startMdns()
        refreshLocalHostOffer()
        syncLocalHostErrorActions()
        maybeCheckReleaseApkUpdate()
    }

    override fun onResume() {
        super.onResume()
        if (!localHostBusy) {
            refreshLocalHostOffer()
        }
        maybeCheckReleaseApkUpdate()
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

    /** Keep the whole manual-entry tile (label + field + Connect) above the soft keyboard. */
    private fun setupImeInsets() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        ViewCompat.setOnApplyWindowInsetsListener(binding.launcherScroll) { view, windowInsets ->
            val bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime())
            view.updatePadding(
                left = bars.left,
                top = bars.top,
                right = bars.right,
                bottom = maxOf(bars.bottom, ime.bottom),
            )
            if (binding.urlInput.hasFocus() && ime.bottom > 0) {
                view.post { ensureManualEntryTileVisible() }
            }
            WindowInsetsCompat.CONSUMED
        }
        binding.urlInput.setOnFocusChangeListener { _, hasFocus ->
            if (hasFocus) binding.launcherScroll.post { ensureManualEntryTileVisible() }
        }
    }

    private fun ensureManualEntryTileVisible() {
        val scroll = binding.launcherScroll
        val tile = binding.manualEntryTile
        val rect = Rect(0, 0, tile.width, tile.height)
        scroll.requestChildRectangleOnScreen(tile, rect, false)
    }

    private fun onLocalHostClicked() {
        if (localHostBusy) return
        val existing = readyLocalOrigin
        if (existing != null) {
            connect(existing)
            return
        }
        when (val snap = LocalHostStatus.read(this)) {
            is LocalHostStatus.Snapshot.Ready -> {
                readyLocalOrigin = snap.origin
                syncLocalHostButton()
                connect(snap.origin)
                return
            }
            else -> Unit
        }
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

    /**
     * On resume / cold start: if status file says READY and loopback still answers,
     * offer Connect instead of Start. Stale READY (host dead) → clear and Start.
     */
    private fun refreshLocalHostOffer() {
        if (localHostBusy) return
        when (val snap = LocalHostStatus.read(this)) {
            is LocalHostStatus.Snapshot.Ready -> {
                val origin = snap.origin
                val token = ++offerProbeToken
                HealthProbe.probe(origin) { ok, _ ->
                    runOnUiThread {
                        if (isFinishing || localHostBusy || token != offerProbeToken) return@runOnUiThread
                        if (ok) {
                            readyLocalOrigin = origin
                            clearLocalHostErrorUi(clearFiles = false)
                            showLocalHostProgress(getString(R.string.local_host_running))
                            syncLocalHostButton()
                        } else {
                            LocalHostStatus.clear(this@LauncherActivity)
                            readyLocalOrigin = null
                            syncLocalHostButton()
                        }
                    }
                }
            }
            is LocalHostStatus.Snapshot.Failed -> {
                readyLocalOrigin = null
                showLocalHostError(snap.message)
                syncLocalHostButton()
            }
            LocalHostStatus.Snapshot.None -> {
                readyLocalOrigin = null
                if (!localHostHasError) {
                    clearLocalHostErrorUi(clearFiles = false)
                }
                syncLocalHostButton()
            }
        }
    }

    private fun startLocalHost() {
        // Never wipe READY / restart when host is already up — that hangs on
        // „Uruchamianie…” because :host refuses a second boot.
        when (val snap = LocalHostStatus.read(this)) {
            is LocalHostStatus.Snapshot.Ready -> {
                readyLocalOrigin = snap.origin
                syncLocalHostButton()
                connect(snap.origin)
                return
            }
            else -> Unit
        }
        readyLocalOrigin = null
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
        readyLocalOrigin = origin
        clearLocalHostErrorUi(clearFiles = false)
        showLocalHostProgress(getString(R.string.local_host_running))
        syncLocalHostButton()
        Log.i(TAG, "local host READY origin=$origin")
        connect(origin)
    }

    private fun onLocalHostFailed(message: String) {
        if (hostTerminal) return
        hostTerminal = true
        stopStatusPoll()
        unbindHostWatch()
        readyLocalOrigin = null
        setLocalHostBusy(false)
        showLocalHostError(message)
        Toast.makeText(this, toastSummary(message), Toast.LENGTH_LONG).show()
    }

    private fun onLocalHostStopped() {
        stopStatusPoll()
        unbindHostWatch()
        // Abort in-flight start; idle Connect → Start after FG Stop.
        hostTerminal = true
        readyLocalOrigin = null
        setLocalHostBusy(false)
        clearLocalHostErrorUi(clearFiles = false)
        syncLocalHostButton()
        Toast.makeText(this, R.string.local_host_stopped, Toast.LENGTH_SHORT).show()
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
        if (hostTerminal || !localHostBusy) {
            // Host died while UI was idle (e.g. after Connect) — drop Connect affordance.
            if (!localHostBusy) {
                readyLocalOrigin = null
                LocalHostStatus.clear(this)
                syncLocalHostButton()
            }
            return
        }
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
        readyLocalOrigin = null
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
        binding.btnLocalHostDiagnosticLog.visibility =
            if (vis.showDiagnosticDownload) View.VISIBLE else View.GONE
        binding.btnHeaderDownloadLog.isEnabled = vis.headerDownloadEnabled
        binding.btnHeaderDownloadLog.alpha = if (vis.headerDownloadEnabled) 1f else 0.4f
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
        // Keep an explicit, stable filename for share-target “save as…”
        // (some targets derive it from chooser/subject, not the URI path).
        val fileName = "stagesync-host-$stamp.txt"
        val file = File(cacheDir, fileName)
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
                putExtra(Intent.EXTRA_SUBJECT, fileName)
                putExtra(Intent.EXTRA_TITLE, fileName)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
        startActivity(Intent.createChooser(send, fileName))
    }

    private fun toastSummary(message: String): String {
        val first = message.lineSequence().firstOrNull()?.trim().orEmpty()
        return if (first.length <= 160) first else first.take(157) + "…"
    }

    private fun setLocalHostBusy(busy: Boolean) {
        localHostBusy = busy
        if (busy) {
            readyLocalOrigin = null
        }
        syncLocalHostButton()
    }

    private fun syncLocalHostButton() {
        val snapshot =
            readyLocalOrigin?.let { LocalHostStatus.Snapshot.Ready(it) }
                ?: LocalHostStatus.Snapshot.None
        val mode = LocalHostButtonMode.from(localHostBusy, snapshot)
        val labelRes =
            when (mode) {
                LocalHostButtonMode.Mode.Busy -> R.string.btn_local_host_busy
                LocalHostButtonMode.Mode.Connect -> R.string.btn_local_host_connect
                LocalHostButtonMode.Mode.Start -> R.string.btn_local_host
            }
        val enabled = mode != LocalHostButtonMode.Mode.Busy
        binding.btnLocalHost.isEnabled = enabled
        binding.btnLocalHost.isClickable = enabled
        binding.btnLocalHost.alpha = if (enabled) 1f else 0.6f
        binding.btnLocalHost.text = getString(labelRes)
        binding.btnLocalHost.contentDescription = getString(labelRes)
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
        setMdnsRefreshing(true)
        binding.status.setText(R.string.status_scanning)
        binding.mdnsList.removeAllViews()
        if (mdns == null) mdns = MdnsBrowser(this)
        mdns?.start { hosts ->
            setMdnsRefreshing(false)
            lastHostCount = hosts.size
            binding.mdnsList.removeAllViews()
            if (hosts.isEmpty()) {
                binding.status.setText(R.string.status_none)
                return@start
            }
            cancelEmptyScanHint()
            binding.status.text = getString(R.string.status_found, hosts.size)
            hosts.forEach { host ->
                binding.mdnsList.addView(hostCard(host.title, host.meta, host.origin))
            }
        }
        val hint =
            Runnable {
                setMdnsRefreshing(false)
                if (lastHostCount == 0 && binding.mdnsList.childCount == 0) {
                    binding.status.setText(R.string.status_none)
                }
            }
        emptyScanRunnable = hint
        mainHandler.postDelayed(hint, 4_000L)
    }

    private fun setMdnsRefreshing(refreshing: Boolean) {
        binding.btnRefresh.isEnabled = !refreshing
        binding.btnRefresh.alpha = if (refreshing) 0.55f else 1f
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
            .setItems(recent.map { it.label }.toTypedArray()) { _, which ->
                val entry = recent[which]
                binding.urlInput.setText(entry.url)
                connect(entry.url, entry.label)
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    private fun hostCard(title: String, meta: String, origin: String): View {
        val card =
            LayoutInflater.from(this).inflate(R.layout.item_host_card, binding.mdnsList, false)
        card.findViewById<TextView>(R.id.hostName).text = title
        card.findViewById<TextView>(R.id.hostOrigin).text = meta
        card.setOnClickListener {
            binding.urlInput.setText(origin)
            connect(origin, title)
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

    private fun connect(raw: String, label: String? = null) {
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
                RecentHosts.push(this, origin, label)
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

    private fun maybeCheckReleaseApkUpdate() {
        if (releaseUpdateDialogShown || releaseUpdateCheckStarted) return
        releaseUpdateCheckStarted = true
        val shellVersion =
            try {
                packageManager.getPackageInfo(packageName, 0).versionName ?: return
            } catch (_: PackageManager.NameNotFoundException) {
                return
            }
        val snoozed =
            getSharedPreferences(ShellConfig.PREFS, MODE_PRIVATE)
                .getString(ShellConfig.PREFS_RELEASE_UPDATE_SNOOZE, null)
        ReleaseApkUpdateChecker.check(
            shellVersion,
            ReleaseApkUpdateChecker.AppKind.CONSOLE,
        ) { offer ->
            if (offer == null) return@check
            if (offer.latestVersion == snoozed) return@check
            runOnUiThread {
                if (isFinishing || releaseUpdateDialogShown) return@runOnUiThread
                releaseUpdateDialogShown = true
                showReleaseUpdateDialog(offer)
            }
        }
    }

    private fun showReleaseUpdateDialog(offer: ReleaseApkUpdateChecker.Offer) {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.update_title, offer.latestVersion))
            .setMessage(getString(R.string.update_message, offer.shellVersion))
            .setPositiveButton(R.string.update_download_install) { _, _ ->
                startReleaseDownloadAndInstall(offer.apkUrl)
            }
            .setNegativeButton(R.string.update_later) { _, _ ->
                getSharedPreferences(ShellConfig.PREFS, MODE_PRIVATE)
                    .edit()
                    .putString(ShellConfig.PREFS_RELEASE_UPDATE_SNOOZE, offer.latestVersion)
                    .apply()
            }
            .setCancelable(true)
            .show()
    }

    private fun startReleaseDownloadAndInstall(apkUrl: String) {
        val progress =
            AlertDialog.Builder(this)
                .setMessage(R.string.update_downloading)
                .setCancelable(false)
                .create()
        progress.show()
        ApkInstaller.downloadThenInstall(
            context = this,
            apkUrl = apkUrl,
            onError = { msg ->
                runOnUiThread {
                    progress.dismiss()
                    Toast.makeText(
                        this,
                        getString(R.string.update_download_failed, msg),
                        Toast.LENGTH_LONG,
                    ).show()
                }
            },
            onReadyToInstall = { file ->
                runOnUiThread {
                    progress.dismiss()
                    if (!ApkInstaller.canInstallPackages(this)) {
                        pendingApkFile = file
                        Toast.makeText(this, R.string.update_need_permission, Toast.LENGTH_LONG)
                            .show()
                        unknownSourcesLauncher.launch(
                            ApkInstaller.unknownSourcesSettingsIntent(this),
                        )
                        return@runOnUiThread
                    }
                    startActivity(ApkInstaller.installIntent(this, file))
                }
            },
        )
    }

    companion object {
        private const val TAG = "SsLocalHost"
        private const val STATUS_POLL_MS = 350L
    }
}
