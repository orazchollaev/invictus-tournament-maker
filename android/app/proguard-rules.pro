# ==============================================================================
# CAPACITOR CORE & PLUGINS
# ==============================================================================
-keep class com.getcapacitor.** { *; }
-keepclassmembers class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# JavascriptInterface kullanımı için
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ==============================================================================
# WEBVIEW & WEBKIT
# ==============================================================================
-keep class android.webkit.** { *; }
-keepclassmembers class android.webkit.** { *; }

# ==============================================================================
# ANDROID SUPPORT / X & GMS (Play Services)
# ==============================================================================
-keep class androidx.** { *; }
-dontwarn androidx.**

-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# ==============================================================================
# OKHTTP & COROUTINES (Ağ istekleri için)
# ==============================================================================
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }

# ==============================================================================
# CRASH REPORTING & DEBUGGING (Hata Analizleri İçin Satır Numaraları)
# ==============================================================================
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile