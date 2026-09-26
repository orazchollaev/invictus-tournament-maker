let loaded: Promise<typeof import("@capacitor-community/admob")> | null = null

/** Lazy-loads the AdMob plugin and initializes it once. Callers check the native platform first. */
export function loadAdMob() {
  loaded ??= import("@capacitor-community/admob").then(async (mod) => {
    await mod.AdMob.initialize()
    return mod
  })
  return loaded
}
