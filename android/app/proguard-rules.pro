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
# ANDROID SUPPORT / X & GMS (Play Services)
# ==============================================================================
# No blanket -keep: each androidx/GMS artifact ships its own consumer
# proguard rules inside its AAR, which R8 merges in automatically — a
# package-wide "{ *; }" here just disables shrinking/obfuscation for most of
# the app's DEX (androidx + Play Services + OkHttp is the bulk of it) without
# protecting anything those consumer rules don't already cover. Only
# -dontwarn is kept, since some optional/reflective references in these
# libraries would otherwise fail the R8 build.
-dontwarn androidx.**
-dontwarn com.google.android.gms.**

# ==============================================================================
# FIREBASE AUTHENTICATION PLUGIN
# ==============================================================================
# @capacitor-firebase/authentication ships a Facebook sign-in handler, but the
# Facebook SDK is only linked when rgcfaIncludeFacebook is set (it is not —
# see variables.gradle). The handler is never reached, so R8 only needs to be
# told its references are expected to be missing.
-dontwarn com.facebook.**

# ==============================================================================
# OKHTTP & COROUTINES (Ağ istekleri için)
# ==============================================================================
-dontwarn okhttp3.**
-dontwarn okio.**

# ==============================================================================
# CRASH REPORTING & DEBUGGING (Hata Analizleri İçin Satır Numaraları)
# ==============================================================================
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile