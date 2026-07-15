import { Capacitor } from "@capacitor/core"
import type { Theme } from "@/modules/settings/store"

const THEME_COLORS: Record<Theme, { color: string; dark: boolean }> = {
  light: { color: "#f8fafc", dark: false },
  dark: { color: "#16181f", dark: true },
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
