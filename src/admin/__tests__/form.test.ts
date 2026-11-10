import { describe, expect, it } from "vitest"
import { APP_LOCALES } from "../constants"
import {
  emptyForm,
  formFromAnnouncement,
  fromLocalInput,
  statusOf,
  toAnnouncement,
  toLocalInput,
  type AnnouncementForm,
} from "../utils/form"

function filled(): AnnouncementForm {
  const form = emptyForm(Date.UTC(2026, 10, 10, 9, 0))
  form.id = "market-launch"
  form.content = [
    { locale: "en", title: "Market", body: "Open now", cta: "" },
    { locale: "tr", title: "Pazar", body: "Açıldı", cta: "" },
  ]
  return form
}

describe("APP_LOCALES", () => {
  it("lists the app's locale files, English first", () => {
    expect(APP_LOCALES[0]).toBe("en")
    expect(APP_LOCALES).toContain("tr")
    expect(APP_LOCALES).toContain("pt-BR")
  })
})

describe("local datetime inputs", () => {
  it("round-trip to the minute", () => {
    const ms = new Date(2026, 10, 10, 9, 30).getTime()
    expect(toLocalInput(ms)).toBe("2026-11-10T09:30")
    expect(fromLocalInput(toLocalInput(ms))).toBe(ms)
  })

  it("reads an empty field as unset", () => {
    expect(fromLocalInput("")).toBeNull()
  })
})

describe("toAnnouncement", () => {
  it("accepts a filled-in form", () => {
    const result = toAnnouncement(filled(), APP_LOCALES)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.announcement).toMatchObject({
      id: "market-launch",
      platforms: null,
      minVersion: null,
      defaultLocale: "en",
      action: null,
      imageUrl: null,
    })
    expect(result.announcement.content.tr).toEqual({ title: "Pazar", body: "Açıldı" })
  })

  it("runs the app's validator, so what it rejects never saves", () => {
    const form = filled()
    form.id = "Bad Id"
    form.endAt = form.startAt
    const result = toAnnouncement(form, APP_LOCALES)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some((e) => e.includes("id"))).toBe(true)
    expect(result.errors).toContain("endAt must be after startAt")
  })

  it("needs a button label in every language once there is an action", () => {
    const form = filled()
    form.actionType = "route"
    form.actionTarget = "/market"
    form.content[0].cta = "Open"
    const result = toAnnouncement(form, APP_LOCALES)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toContain("content.tr.cta is required because there is an action")
  })

  it("rejects the same language twice", () => {
    const form = filled()
    form.content.push({ locale: "tr", title: "x", body: "y", cta: "" })
    const result = toAnnouncement(form, APP_LOCALES)
    expect(result.ok).toBe(false)
  })
})

describe("formFromAnnouncement", () => {
  it("is the inverse of toAnnouncement", () => {
    const form = filled()
    form.platforms = ["android"]
    form.minVersion = "4.0.0"
    form.actionType = "url"
    form.actionTarget = "https://example.com"
    form.content = form.content.map((r) => ({ ...r, cta: "Go" }))
    form.imageUrl = "https://example.com/a.png"
    const first = toAnnouncement(form, APP_LOCALES)
    if (!first.ok) throw new Error(first.errors.join("; "))
    const again = toAnnouncement(formFromAnnouncement(first.announcement), APP_LOCALES)
    expect(again).toEqual(first)
  })
})

describe("statusOf", () => {
  const window = { enabled: true, startAt: 100, endAt: 200 }
  it("follows the window and the off switch", () => {
    expect(statusOf(window, 50)).toBe("scheduled")
    expect(statusOf(window, 100)).toBe("live")
    expect(statusOf(window, 200)).toBe("ended")
    expect(statusOf({ ...window, enabled: false }, 150)).toBe("disabled")
  })
})
