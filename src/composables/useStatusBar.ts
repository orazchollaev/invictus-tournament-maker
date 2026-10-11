import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core"
import type { Theme } from "@/modules/settings/store"

/**
 * Native system-bar icon style. The app draws edge to edge, so the bars
 * themselves are transparent and the page's own `--bg` shows behind them;
 * the only thing left to set is whether their icons are light or dark.
 * (Painting the bar itself used `Window.setStatusBarColor`, which Android 15
 * deprecated and which no longer has any effect.)
 */
const THEME_STYLES: Record<Theme, SystemBarsStyle> = {
  light: SystemBarsStyle.Light,
  dark: SystemBarsStyle.Dark,
}

export function useStatusBar() {
  async function setTheme(theme: Theme) {
    if (!Capacitor.isNativePlatform()) return
    try {
      await SystemBars.setStyle({ style: THEME_STYLES[theme] ?? SystemBarsStyle.Dark })
    } catch {
      // ignore — system bars API unavailable
    }
  }

  return { setTheme }
}
