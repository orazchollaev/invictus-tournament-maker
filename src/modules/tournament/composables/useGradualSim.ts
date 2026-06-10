import { useSettingsStore } from "@/modules/settings/store"

export function useGradualSim() {
  const settings = useSettingsStore()

  async function runSequential(callbacks: (() => void)[], delay = 100): Promise<void> {
    if (!settings.gradualReveal || callbacks.length <= 1) {
      callbacks.forEach((fn) => fn())
      return
    }
    for (const fn of callbacks) {
      fn()
      await new Promise<void>((resolve) => setTimeout(resolve, delay))
    }
  }

  return { runSequential }
}
