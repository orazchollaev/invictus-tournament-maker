import { describe, expect, it } from "vitest"
import { decodeFields, documentId } from "../utils/firestoreRest"
import { parseAnnouncement } from "../utils/validate"

describe("Firestore REST decoding", () => {
  // The shape runQuery returns for a document written by `pnpm announce`.
  const fields = {
    enabled: { booleanValue: true },
    priority: { integerValue: "2" },
    startAt: { timestampValue: "2026-11-10T06:00:00Z" },
    endAt: { timestampValue: "2026-11-17T20:59:00.500Z" },
    frequency: { stringValue: "daily" },
    platforms: { arrayValue: { values: [{ stringValue: "android" }] } },
    minVersion: { nullValue: null },
    maxVersion: { nullValue: null },
    defaultLocale: { stringValue: "en" },
    imageUrl: { nullValue: null },
    action: {
      mapValue: {
        fields: { type: { stringValue: "route" }, target: { stringValue: "/market" } },
      },
    },
    content: {
      mapValue: {
        fields: {
          en: {
            mapValue: {
              fields: {
                title: { stringValue: "New" },
                body: { stringValue: "Text" },
                cta: { stringValue: "Open" },
              },
            },
          },
        },
      },
    },
    updatedAt: { timestampValue: "2026-11-07T10:00:00Z" },
    tags: { arrayValue: {} },
  }

  it("unwraps every value type", () => {
    const data = decodeFields(fields)
    expect(data.priority).toBe(2)
    expect(data.platforms).toEqual(["android"])
    expect(data.tags).toEqual([])
    expect(data.minVersion).toBeNull()
    expect(data.action).toEqual({ type: "route", target: "/market" })
  })

  it("decodes into a document the validator accepts", () => {
    const result = parseAnnouncement("news", decodeFields(fields))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.announcement.startAt).toBe(Date.UTC(2026, 10, 10, 6))
    expect(result.announcement.endAt).toBe(Date.UTC(2026, 10, 17, 20, 59, 0, 500))
    expect(result.announcement.content.en.cta).toBe("Open")
  })

  it("takes the id from the document path", () => {
    expect(documentId("projects/p/databases/(default)/documents/announcements/v4-launch")).toBe(
      "v4-launch"
    )
  })
})
