package com.orazchollaev.invictustournamentmaker;

import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

/**
 * Bridges the real window insets into CSS.
 *
 * <p>From API 35 Android draws every app edge to edge and the opt-out is
 * gone, so the WebView fills the screen including the area behind the
 * status and navigation bars. Android's WebView only maps the display
 * cutout into {@code env(safe-area-inset-*)} — the system bars come back
 * as 0 — so pages would render underneath the navigation bar.
 *
 * <p>The insets are measured here and written onto {@code <html>} as
 * {@code --safe-area-inset-*}, which assets/style/variables.css reads
 * through its {@code --safe-*} tokens (falling back to {@code env()} on
 * platforms that report insets correctly, such as iOS and the browser).
 */
public class MainActivity extends BridgeActivity {

    private static final String SET_INSETS_JS =
        "(function(s){" +
        "  var r=document.documentElement.style;" +
        "  r.setProperty('--safe-area-inset-top',s[0]+'px');" +
        "  r.setProperty('--safe-area-inset-bottom',s[1]+'px');" +
        "  r.setProperty('--safe-area-inset-left',s[2]+'px');" +
        "  r.setProperty('--safe-area-inset-right',s[3]+'px');" +
        "})([%f,%f,%f,%f]);";

    // A renderer that dies again this soon after a recovery is crashing on
    // load; recreating once more would only loop.
    private static final long RECOVERY_LOOP_WINDOW_MS = 10_000;
    private static long lastRecoveryAt = 0;

    private float[] lastInsets;
    private boolean rendererGone = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // No bridge means the device has no usable WebView and Capacitor has
        // already shown its fallback screen.
        if (getBridge() == null) return;

        // When the WebView renderer process dies (OOM kill, GPU driver fault),
        // Capacitor reports it as unhandled and Android then kills the whole
        // app with a native crash in libwebviewchromium.so. Claiming it and
        // rebuilding the activity with a fresh WebView turns that into a reload.
        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                rendererGone = true;
                long now = SystemClock.elapsedRealtime();
                boolean looping = lastRecoveryAt != 0 && now - lastRecoveryAt < RECOVERY_LOOP_WINDOW_MS;
                lastRecoveryAt = now;
                if (looping) finish();
                else recreate();
                return true;
            }
        });

        // Explicit for API < 35, where edge to edge is not yet the default.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        View root = getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, windowInsets) -> {
            // systemBars() deliberately excludes the IME: the layout must
            // not shift when the keyboard opens.
            Insets insets = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            float density = getResources().getDisplayMetrics().density;
            lastInsets = new float[] {
                insets.top / density,
                insets.bottom / density,
                insets.left / density,
                insets.right / density,
            };
            applyInsets();
            return windowInsets;
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        // The web page may have reloaded since the last inset dispatch,
        // which resets the custom properties on <html>.
        applyInsets();
    }

    private void applyInsets() {
        if (rendererGone || lastInsets == null || getBridge() == null) return;
        WebView webView = getBridge().getWebView();
        if (webView == null) return;

        String js = String.format(
            java.util.Locale.US,
            SET_INSETS_JS,
            lastInsets[0],
            lastInsets[1],
            lastInsets[2],
            lastInsets[3]
        );
        webView.post(() -> webView.evaluateJavascript(js, null));
    }
}
