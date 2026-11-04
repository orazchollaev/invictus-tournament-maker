import { describe, expect, it } from "vitest"
import { registerPlugin } from "@capacitor/core"

// A Capacitor plugin is a Proxy that answers every property with a method
// wrapper — `then` included. Returning one from an async function (or resolving
// a promise with it) makes the promise treat it as a thenable and call a native
// `then` that never settles, so the caller waits forever without an error. This
// is how Google sign-in silently did nothing on Android.

const settle = <T>(p: Promise<T>, ms = 50) =>
  Promise.race([
    p.then(() => "settled" as const),
    new Promise((r) => setTimeout(() => r("hung"), ms)),
  ])

describe("Capacitor plugins and promises", () => {
  it("hangs when a plugin is returned from an async function", async () => {
    // Stands in for the native side: a `then` call that never invokes the
    // resolve/reject callbacks the promise machinery passes it.
    const Plugin = registerPlugin<Record<string, never>>("ThenableProbe", {
      web: { then: () => undefined },
    })
    const handOver = async () => Plugin
    expect(await settle(handOver())).toBe("hung")
  })

  it("is never handed through a promise in app code", () => {
    const sources = import.meta.glob<string>(["/src/**/*.{ts,vue}", "!/src/**/__tests__/**"], {
      query: "?raw",
      import: "default",
      eager: true,
    })
    // `const { X } = await import("@capacitor…")` followed by `return X`.
    const returnsPlugin =
      /const \{ (\w+) \} = await import\("@capacitor[^"]*"\)[\s\S]{0,120}?return \1\b/
    const offenders = Object.entries(sources)
      .filter(([, code]) => returnsPlugin.test(code))
      .map(([file]) => file)
    expect(offenders).toEqual([])
  })
})
