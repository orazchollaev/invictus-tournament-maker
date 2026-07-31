import { Capacitor } from "@capacitor/core"
import type { Theme } from "@/modules/settings/store"

/**
 * Native status-bar tint. The colours must match `--bg` in
 * assets/style/variables.css or the status bar reads as a slightly
 * different shade than the page behind it — they had drifted
 * (#f8fafc / #16181f vs the real #f1f4f9 / #14161c).
 *
 * They are duplicated rather than read from CSS because this runs
 * before paint and the Capacitor bridge needs a plain hex string.
 */
const THEME_COLORS: Record<Theme, { color: string; dark: boolean }> = {
  light: { color: "#f1f4f9", dark: false },
  dark: { color: "#14161c", dark: true },
}

export function useStatusBar() {
  async function setTheme(theme: Theme) {
    if (!Capacitor.isNativePlatform()) return
    try {
      const { StatusBar, Style } = await import("@capacitor/status-bar")
      const { color, dark } = THEME_COLORS[theme] ?? THEME_COLORS.dark
      await StatusBar.setBackgroundColor({ color })
      await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light })
    } catch {
      // ignore — status bar API unavailable
    }
  }

  return { setTheme }
}
