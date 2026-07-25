# Keep StageSync Console symbols for WebView bridge.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
