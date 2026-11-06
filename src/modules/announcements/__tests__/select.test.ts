import { describe, expect, it } from "vitest"
import type { Announcement } from "../types"
import {
  isDue,
  markSeen,
  pickAnnouncement,
  pruneSeen,
  resolveText,
  targets,
  type SelectContext,
} from "../utils/select"
import { compareVersions } from "../utils/version"

const NOW = new Date(2026, 10, 12, 12).getTime()
const HOUR = 3_600_000
const DAY = 24 * HOUR

function make(over: Partial<Announcement> = {}): Announcement {
  return {
    id: "a",
    enabled: true,
    startAt: NOW - DAY,
    endAt: NOW + DAY,
    priority: 0,
    frequency: "once",
    platforms: null,
    minVersion: null,
    maxVersion: null,
    defaultLocale: "en",
    content: { en: { title: "Hello", body: "Body" } },
    action: null,
    imageUrl: null,
    ...over,
  }
}

function ctx(over: Partial<SelectContext> = {}): SelectContext {
  return {
    now: NOW,
    locale: "en",
    platform: "android",
    appVersion: "4.1.0",
    seen: {},
    shownThisSession: new Set(),
    ...over,
  }
}

describe("compareVersions", () => {
  it("compares numerically, part by part", () => {
    expect(compareVersions("4.10.0", "4.9.9")).toBe(1)
    expect(compareVersions("4.1", "4.1.0")).toBe(0)
    expect(compareVersions("4.0.1", "4.1")).toBe(-1)
  })
})

describe("pickAnnouncement", () => {
  it("shows a live one, with its text in the user's language", () => {
    expect(pickAnnouncement([make()], ctx())).toEqual({
      id: "a",
      locale: "en",
      title: "Hello",
      body: "Body",
      ctaLabel: null,
      action: null,
      imageUrl: null,
    })
  })

  it("keeps to the window: start inclusive, end exclusive, and the off switch", () => {
    expect(pickAnnouncement([make({ startAt: NOW })], ctx())).not.toBeNull()
    expect(pickAnnouncement([make({ startAt: NOW + 1 })], ctx())).toBeNull()
    expect(pickAnnouncement([make({ endAt: NOW })], ctx())).toBeNull()
    expect(pickAnnouncement([make({ enabled: false })], ctx())).toBeNull()
  })

  it("prefers the higher priority, then the newer start", () => {
    const low = make({ id: "low", priority: 0, startAt: NOW - HOUR })
    const high = make({ id: "high", priority: 5, startAt: NOW - DAY })
    const newer = make({ id: "newer", priority: 0, startAt: NOW - 1 })
    expect(pickAnnouncement([low, high, newer], ctx())?.id).toBe("high")
    expect(pickAnnouncement([low, newer], ctx())?.id).toBe("newer")
  })

  it("skips one it cannot show in any language and moves to the next", () => {
    const trOnly = make({
      id: "tr-only",
      priority: 9,
      defaultLocale: null,
      content: { tr: { title: "Merhaba", body: "x" } },
    })
    expect(pickAnnouncement([trOnly, make()], ctx({ locale: "de" }))?.id).toBe("a")
    expect(pickAnnouncement([trOnly, make()], ctx({ locale: "tr" }))?.id).toBe("tr-only")
  })

  it("carries the button label only with an action", () => {
    const withCta = make({
      action: { type: "route", target: "/market" },
      content: { en: { title: "t", body: "b", cta: "Open" } },
    })
    expect(pickAnnouncement([withCta], ctx())?.ctaLabel).toBe("Open")
  })
})

describe("targets", () => {
  it("filters by platform and inclusive version bounds", () => {
    expect(targets(make({ platforms: ["web"] }), ctx())).toBe(false)
    expect(targets(make({ platforms: ["web", "android"] }), ctx())).toBe(true)
    expect(targets(make({ minVersion: "4.1.0" }), ctx())).toBe(true)
    expect(targets(make({ minVersion: "4.1.1" }), ctx())).toBe(false)
    expect(targets(make({ maxVersion: "4.1" }), ctx())).toBe(true)
    expect(targets(make({ maxVersion: "4.0.9" }), ctx())).toBe(false)
  })
})

describe("resolveText", () => {
  const a = make({
    defaultLocale: "en",
    content: {
      en: { title: "en", body: "" },
      pt: { title: "pt", body: "" },
      tr: { title: "tr", body: "" },
    },
  })

  it("uses the exact language, then a regional sibling, then the fallback", () => {
    expect(resolveText(a, "tr")?.locale).toBe("tr")
    expect(resolveText(a, "pt-BR")?.locale).toBe("pt")
    expect(resolveText(a, "ja")?.locale).toBe("en")
  })

  it("finds the regional variant from the plain language too", () => {
    const br = make({ defaultLocale: null, content: { "pt-BR": { title: "br", body: "" } } })
    expect(resolveText(br, "pt")?.locale).toBe("pt-BR")
  })

  it("gives up without a fallback", () => {
    expect(resolveText(make({ defaultLocale: null }), "ja")).toBeNull()
  })
})

describe("isDue", () => {
  const none = new Set<string>()
  const seenAt = (last: number) => ({ last, count: 1 })

  it("never twice in one session, whatever the frequency", () => {
    expect(isDue(make({ frequency: "launch" }), undefined, NOW, new Set(["a"]))).toBe(false)
  })

  it("once: only while unseen", () => {
    expect(isDue(make(), undefined, NOW, none)).toBe(true)
    expect(isDue(make(), seenAt(NOW - 300 * DAY), NOW, none)).toBe(false)
  })

  it("daily: once per calendar day, not per 24 hours", () => {
    const daily = make({ frequency: "daily" })
    const morning = new Date(2026, 10, 12, 8).getTime()
    const lastNight = new Date(2026, 10, 11, 23).getTime()
    expect(isDue(daily, seenAt(morning), NOW, none)).toBe(false)
    expect(isDue(daily, seenAt(lastNight), NOW, none)).toBe(true)
  })

  it("launch: every new session", () => {
    expect(isDue(make({ frequency: "launch" }), seenAt(NOW - 1), NOW, none)).toBe(true)
  })
})

describe("seen log", () => {
  it("counts shows and forgets entries past the retention", () => {
    let log = markSeen({}, "a", NOW - 2 * DAY)
    log = markSeen(log, "a", NOW)
    log = markSeen(log, "old", NOW - 10 * DAY)
    expect(log.a).toEqual({ last: NOW, count: 2 })
    expect(Object.keys(pruneSeen(log, NOW, 5 * DAY))).toEqual(["a"])
  })
})
