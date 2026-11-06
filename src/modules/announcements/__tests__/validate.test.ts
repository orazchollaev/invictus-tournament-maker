import { describe, expect, it } from "vitest"
import { parseAnnouncement, toMillis } from "../utils/validate"

const valid = {
  startAt: "2026-11-10T09:00:00+03:00",
  endAt: "2026-11-17T23:59:00+03:00",
  content: { en: { title: "Hello", body: "World" } },
}

function errorsOf(raw: unknown, id = "news", options = {}) {
  const result = parseAnnouncement(id, raw, options)
  return result.ok ? [] : result.errors
}

describe("toMillis", () => {
  it("reads zoned strings, numbers, Dates and Timestamps alike", () => {
    const ms = Date.UTC(2026, 10, 10, 6)
    expect(toMillis("2026-11-10T09:00:00+03:00")).toBe(ms)
    expect(toMillis("2026-11-10T06:00:00Z")).toBe(ms)
    expect(toMillis(ms)).toBe(ms)
    expect(toMillis(new Date(ms))).toBe(ms)
    expect(toMillis({ seconds: ms / 1000, nanoseconds: 0 })).toBe(ms)
    expect(toMillis({ _seconds: ms / 1000, _nanoseconds: 0 })).toBe(ms)
    expect(toMillis({ toMillis: () => ms })).toBe(ms)
  })

  it("refuses a date without a zone, which means a different moment on every machine", () => {
    expect(toMillis("2026-11-10T09:00:00")).toBeNull()
    expect(toMillis("2026-11-10")).toBeNull()
    expect(toMillis("soon")).toBeNull()
  })
})

describe("parseAnnouncement", () => {
  it("fills the defaults", () => {
    const result = parseAnnouncement("news", valid)
    expect(result.ok && result.announcement).toEqual({
      id: "news",
      enabled: true,
      startAt: Date.UTC(2026, 10, 10, 6),
      endAt: Date.UTC(2026, 10, 17, 20, 59),
      priority: 0,
      frequency: "once",
      platforms: null,
      minVersion: null,
      maxVersion: null,
      defaultLocale: null,
      content: { en: { title: "Hello", body: "World" } },
      action: null,
      imageUrl: null,
    })
  })

  it("trims the text", () => {
    const result = parseAnnouncement("news", {
      ...valid,
      content: { en: { title: "  Hi ", body: " there\n" } },
    })
    expect(result.ok && result.announcement.content.en).toEqual({ title: "Hi", body: "there" })
  })

  it("rejects a bad id, missing dates and an end before the start", () => {
    expect(errorsOf(valid, "Bad Id")).toHaveLength(1)
    expect(errorsOf({ ...valid, startAt: undefined })).toHaveLength(1)
    expect(errorsOf({ ...valid, endAt: valid.startAt })).toEqual(["endAt must be after startAt"])
  })

  it("requires a title and body in every language, within the limits", () => {
    expect(errorsOf({ ...valid, content: {} })).toHaveLength(1)
    expect(errorsOf({ ...valid, content: { en: { title: "x" } } })).toEqual([
      "content.en.body is required",
    ])
    expect(errorsOf({ ...valid, content: { en: { title: "x".repeat(81), body: "y" } } })).toEqual([
      "content.en.title is 81 characters (max 80)",
    ])
  })

  it("requires a button label in every language once there is an action", () => {
    const raw = {
      ...valid,
      action: { type: "route", target: "/market" },
      content: { en: { title: "a", body: "b", cta: "Go" }, tr: { title: "a", body: "b" } },
    }
    expect(errorsOf(raw)).toEqual(["content.tr.cta is required because there is an action"])
  })

  it("accepts only app paths and https links as actions", () => {
    const withAction = (action: unknown) => ({
      ...valid,
      action,
      content: { en: { title: "a", body: "b", cta: "Go" } },
    })
    expect(errorsOf(withAction({ type: "route", target: "/market" }))).toEqual([])
    expect(errorsOf(withAction({ type: "url", target: "https://example.com" }))).toEqual([])
    expect(errorsOf(withAction({ type: "route", target: "//evil.com" }))).toHaveLength(1)
    expect(errorsOf(withAction({ type: "url", target: "http://example.com" }))).toHaveLength(1)
    expect(errorsOf(withAction({ type: "url", target: "javascript:alert(1)" }))).toHaveLength(1)
    expect(errorsOf(withAction({ type: "share", target: "/x" }))).toHaveLength(1)
  })

  it("checks the fallback language is one that exists", () => {
    expect(errorsOf({ ...valid, defaultLocale: "en" })).toEqual([])
    expect(errorsOf({ ...valid, defaultLocale: "tr" })).toHaveLength(1)
  })

  it("checks platforms, versions, frequency and the image link", () => {
    expect(errorsOf({ ...valid, platforms: ["android"], minVersion: "4.1" })).toEqual([])
    expect(errorsOf({ ...valid, platforms: [] })).toHaveLength(1)
    expect(errorsOf({ ...valid, platforms: ["windows"] })).toHaveLength(1)
    expect(errorsOf({ ...valid, maxVersion: "v4" })).toHaveLength(1)
    expect(errorsOf({ ...valid, frequency: "weekly" })).toHaveLength(1)
    expect(errorsOf({ ...valid, imageUrl: "http://x.com/a.png" })).toHaveLength(1)
  })

  it("lets unknown keys through for the app, but not in strict mode", () => {
    const raw = { ...valid, frequncy: "daily", updatedAt: "x" }
    expect(errorsOf(raw)).toEqual([])
    expect(errorsOf(raw, "news", { strict: true })).toEqual([
      'unknown key "frequncy"',
      'unknown key "updatedAt"',
    ])
  })

  it("rejects languages the app does not ship when told which it does", () => {
    const raw = { ...valid, content: { ...valid.content, xx: { title: "a", body: "b" } } }
    expect(errorsOf(raw)).toEqual([])
    expect(errorsOf(raw, "news", { knownLocales: ["en", "tr"] })).toEqual([
      'content.xx: the app has no "xx" locale',
    ])
  })
})
