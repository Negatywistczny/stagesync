# Keep StageSync Console symbols for WebView bridge.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# JNI façade for nodejs-mobile — method names must match native-lib.cpp.
-keep class com.stagesync.console.LocalHostNative { *; }
-keepclassmembers class com.stagesync.console.LocalHostNative {
    native <methods>;
    public static *;
}

# Local host types referenced from the manifest / broadcasts.
-keep class com.stagesync.console.LocalHostService { *; }
-keep class com.stagesync.console.LocalHostRuntime { *; }
-keep class com.stagesync.console.HostAssetExtractor { *; }
