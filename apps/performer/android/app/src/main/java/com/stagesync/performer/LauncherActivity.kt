package com.stagesync.performer

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Rect
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import com.stagesync.performer.databinding.ActivityLauncherBinding

class LauncherActivity : AppCompatActivity() {
    private lateinit var binding: ActivityLauncherBinding
    private var mdns: MdnsBrowser? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var emptyScanRunnable: Runnable? = null
    private var lastHostCount = 0
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLauncherBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupImeInsets()

        binding.btnConnect.setOnClickListener {
            connect(binding.urlInput.text?.toString().orEmpty())
        }
        binding.btnQr.setOnClickListener { startQr() }
        binding.btnRecent.setOnClickListener { showRecentDialog() }
        binding.btnRefresh.setOnClickListener { startMdns() }

        startMdns()
        maybeCheckReleaseApkUpdate()
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

    override fun onResume() {
        super.onResume()
        maybeCheckReleaseApkUpdate()
    }

    override fun onDestroy() {
        cancelEmptyScanHint()
        mdns?.stop()
        super.onDestroy()
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
                binding.mdnsList.addView(hostCard(host.name, host.origin))
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
            ReleaseApkUpdateChecker.AppKind.PERFORMER,
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
}
