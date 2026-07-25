package com.stagesync.performer

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import com.stagesync.performer.databinding.ActivityHostWebBinding

/**
 * Loads `{origin}/client` in a kiosk-ish WebView.
 *
 * Dual wake-lock: [FLAG_KEEP_SCREEN_ON] here + PWA Screen Wake Lock API inside the SPA.
 * JS bridge name `StageSyncNative` — reserved for future version/checksum prompt (manual download only).
 */
class HostWebActivity : AppCompatActivity() {
    companion object {
        const val EXTRA_ORIGIN = "origin"
    }

    private lateinit var binding: ActivityHostWebBinding

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHostWebBinding.inflate(layoutInflater)
        setContentView(binding.root)

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        enterImmersive()

        val origin = intent.getStringExtra(EXTRA_ORIGIN)?.trimEnd('/')
        if (origin.isNullOrEmpty()) {
            finish()
            return
        }

        val web = binding.webView
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
        }
        // Pull-to-refresh is browser chrome; WebView has no address bar — still block overscroll glow noise.
        web.overScrollMode = View.OVER_SCROLL_NEVER
        web.webChromeClient = WebChromeClient()
        web.webViewClient =
            object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?,
                ): Boolean = false
            }
        web.addJavascriptInterface(NativeBridge(), "StageSyncNative")
        web.loadUrl("$origin${ShellConfig.ENTRY_PATH}")

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    // Kiosk: back returns to launcher instead of history spam / exit.
                    if (web.canGoBack()) {
                        // Prefer leaving the role view for launcher, not deep history.
                        finish()
                    } else {
                        finish()
                    }
                }
            },
        )
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) enterImmersive()
    }

    private fun enterImmersive() {
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility =
            (View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN)
    }

    /**
     * Bridge notes for dual wake-lock / future update prompt.
     * No secrets. Manual APK download only (no silent install).
     */
    class NativeBridge {
        @android.webkit.JavascriptInterface
        fun shellKind(): String = "performer"

        @android.webkit.JavascriptInterface
        fun keepScreenOnNative(): Boolean = true
    }
}
