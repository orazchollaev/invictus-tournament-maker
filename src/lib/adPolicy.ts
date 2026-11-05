/**
 * Every tunable ad number, with the value the app ships with. The same keys in
 * Firebase Remote Config override them (see lib/remoteConfig.ts), so frequency
 * can be tuned without a release.
 */
export interface AdConfig {
  /** Minimum minutes between two full-screen ads the user did not ask for. */
  ad_min_gap_minutes: number
  /** Minutes after the very first launch with no unrequested full-screen ad at all. */
  ad_grace_minutes: number
  /** Creation score that triggers an interstitial (1 per new tournament, 0.75 per new season). */
  ad_creation_trigger: number
  /** Every Nth community dataset added shows an interstitial. */
  ad_market_every: number
  /** Every Nth built-in sample dataset added shows an interstitial. */
  ad_sample_data_every: number
  /** Interstitial when a tournament is won (if no review or support prompt took the moment). */
  ad_tournament_end: boolean
  /** Interstitial on the way to the Monte Carlo results. */
  ad_simulation_end: boolean
  /** Minimum hours between two app-open ads. */
  ad_app_open_interval_hours: number
  /** From this launch on, a cold start may show an app-open ad too. 0 turns cold starts off. */
  ad_app_open_cold_start_from_launch: number
}

export const AD_CONFIG_DEFAULTS: AdConfig = {
  ad_min_gap_minutes: 3,
  ad_grace_minutes: 10,
  ad_creation_trigger: 2,
  ad_market_every: 2,
  ad_sample_data_every: 2,
  ad_tournament_end: true,
  ad_simulation_end: true,
  ad_app_open_interval_hours: 2,
  ad_app_open_cold_start_from_launch: 3,
}

const MINUTE = 60_000

/**
 * Whether an unrequested full-screen ad may show now: never inside the grace
 * period after the first launch, and never sooner than the gap after the last one.
 */
export function fullscreenAllowed(
  now: number,
  lastShownAt: number,
  firstLaunchAt: number,
  cfg: Pick<AdConfig, "ad_min_gap_minutes" | "ad_grace_minutes">
): boolean {
  if (firstLaunchAt && now - firstLaunchAt < cfg.ad_grace_minutes * MINUTE) return false
  return now - lastShownAt >= cfg.ad_min_gap_minutes * MINUTE
}

/**
 * Overlays the string values Remote Config hands back onto the defaults. Keys it
 * does not know, and values that do not parse as the default's type, are ignored,
 * so a typo in the console can never switch ads off or flood the user.
 */
export function parseAdConfig(values: Record<string, string>, defaults = AD_CONFIG_DEFAULTS) {
  const out: AdConfig = { ...defaults }
  const target = out as unknown as Record<string, number | boolean>
  for (const key of Object.keys(defaults) as (keyof AdConfig)[]) {
    const raw = values[key]?.trim()
    if (!raw) continue
    if (typeof defaults[key] === "boolean") {
      if (raw === "true" || raw === "false") target[key] = raw === "true"
    } else {
      const n = Number(raw)
      if (Number.isFinite(n) && n >= 0) target[key] = n
    }
  }
  return out
}

/** Whether the Nth occurrence (1-based count) is due an ad when every `every`th one shows. */
export function countReached(count: number, every: number): boolean {
  return every > 0 && count >= every
}
