import { Capacitor } from "@capacitor/core"
import { AD_CONFIG_DEFAULTS, parseAdConfig, type AdConfig } from "./adPolicy"

/** Fetched at most this often; Firebase serves the cached values in between. */
const FETCH_INTERVAL_SECONDS = 6 * 60 * 60

/**
 * The live ad numbers. Starts as the shipped defaults and is replaced in place
 * as Remote Config answers, so readers always get a usable value synchronously.
 */
export const adConfig: AdConfig = { ...AD_CONFIG_DEFAULTS }

let cached: Promise<void> | null = null

type RemoteConfigPlugin =
  (typeof import("@capacitor-firebase/remote-config"))["FirebaseRemoteConfig"]

async function apply(plugin: RemoteConfigPlugin) {
  const { values } = await plugin.getAll()
  const raw = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.value]))
  Object.assign(adConfig, parseAdConfig(raw))
}

/**
 * Applies the values activated on an earlier launch (a local read, fast), then
 * fetches fresh ones in the background for the rest of this launch. The returned
 * promise settles after the local read only, so a cold-start decision is not held
 * up by the network. Native only: the web build shows no ads. Best-effort.
 */
export function loadRemoteConfig(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve()
  cached ??= (async () => {
    try {
      const { FirebaseRemoteConfig } = await import("@capacitor-firebase/remote-config")
      await apply(FirebaseRemoteConfig).catch(() => {})
      void (async () => {
        await FirebaseRemoteConfig.setSettings({
          minimumFetchIntervalInSeconds: FETCH_INTERVAL_SECONDS,
          fetchTimeoutInSeconds: 10,
        })
        await FirebaseRemoteConfig.fetchAndActivate()
        await apply(FirebaseRemoteConfig)
      })().catch(() => {})
    } catch {
      // best-effort: silently ignore if unavailable
    }
  })()
  return cached
}
