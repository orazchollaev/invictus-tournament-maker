import { describe, expect, it } from "vitest"
import { parseStack } from "@/lib/crashlytics"

describe("parseStack", () => {
  it("returns no frames for a missing stack", () => {
    expect(parseStack(undefined)).toEqual([])
    expect(parseStack("")).toEqual([])
  })

  it("parses named, bare and async V8 frames and skips the message line", () => {
    const stack = [
      "TypeError: Cannot read properties of undefined (reading 'id')",
      "    at Ke (https://localhost/assets/index-abc123.js:1:2345)",
      "    at https://localhost/assets/vendor-def.js:3:99",
      "    at async Object.simulate (https://localhost/assets/index-abc123.js:1:777)",
    ].join("\n")

    expect(parseStack(stack)).toEqual([
      { functionName: "Ke", fileName: "index-abc123.js:1:2345", lineNumber: 1 },
      { functionName: "<anonymous>", fileName: "vendor-def.js:3:99", lineNumber: 3 },
      { functionName: "Object.simulate", fileName: "index-abc123.js:1:777", lineNumber: 1 },
    ])
  })

  it("ignores lines it cannot read", () => {
    expect(parseStack("Error: x\n    at <anonymous>\n    at native")).toEqual([])
  })

  it("caps the number of frames", () => {
    const stack = Array.from({ length: 50 }, (_, i) => `    at f${i} (https://h/a.js:1:${i})`)
    expect(parseStack(stack.join("\n"))).toHaveLength(30)
  })
})
