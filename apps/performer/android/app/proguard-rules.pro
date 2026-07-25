# Keep StageSync Performer symbols for WebView bridge.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
