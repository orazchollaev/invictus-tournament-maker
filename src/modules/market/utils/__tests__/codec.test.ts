import { describe, expect, it } from "vitest"
import { decodeDataset, encodeDataset } from "../codec"
import { validateDataset } from "../validateDataset"

const examples = import.meta.glob<unknown>("../../../../examples/*.json", {
  eager: true,
  import: "default",
})

describe("dataset codec", () => {
  it("round-trips every bundled example and stays far below the document limit", async () => {
    for (const [file, raw] of Object.entries(examples)) {
      const dataset = validateDataset(raw)!
      const packed = await encodeDataset(dataset)
      expect(packed.length, file).toBeLessThan(60_000)
      expect(await decodeDataset(packed), file).toEqual(dataset)
    }
  })

  it("refuses to encode an invalid dataset", async () => {
    await expect(encodeDataset({ label: "x" } as never)).rejects.toThrow("invalid-dataset")
  })

  it("returns null for garbage instead of throwing", async () => {
    expect(await decodeDataset("not base64 !!")).toBeNull()
    expect(await decodeDataset(42)).toBeNull()
    expect(await decodeDataset("")).toBeNull()
    expect(await decodeDataset("A".repeat(900_001))).toBeNull()
  })

  it("returns null when the payload decodes to something invalid", async () => {
    const bytes = new Uint8Array(
      await new Response(
        new Blob([JSON.stringify({ label: "x" })])
          .stream()
          .pipeThrough(new CompressionStream("gzip"))
      ).arrayBuffer()
    )
    let binary = ""
    for (const b of bytes) binary += String.fromCharCode(b)
    expect(await decodeDataset(btoa(binary))).toBeNull()
  })
})
