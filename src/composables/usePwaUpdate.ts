import { ref } from "vue"
import { Capacitor } from "@capacitor/core"
import { useRegisterSW } from "virtual:pwa-register/vue"

export function usePwaUpdate() {
  if (Capacitor.isNativePlatform()) {
    return { needRefresh: ref(false), applyUpdate: () => {} }
  }

  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Poll every 60 seconds to catch new Vercel deployments
      if (r) {
        setInterval(async () => {
          if (!(!r.installing && navigator)) return
          if ("connection" in navigator && !navigator.onLine) return
          const resp = await fetch(swUrl, {
            cache: "no-store",
            headers: { cache: "no-store", "cache-control": "no-cache" },
          })
          if (resp?.status === 200) await r.update()
        }, 60_000)
      }
    },
  })

  function applyUpdate() {
    updateServiceWorker(true)
  }

  return { needRefresh, applyUpdate }
}
