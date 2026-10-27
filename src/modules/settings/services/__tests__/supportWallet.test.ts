import { describe, expect, it } from "vitest"
import { classifySendError } from "../supportWallet"

describe("classifySendError", () => {
  it("reads an ethers rejection", () => {
    expect(classifySendError({ code: "ACTION_REJECTED" })).toBe("rejected")
  })

  it("reads an EIP-1193 rejection, nested or not", () => {
    expect(classifySendError({ code: 4001 })).toBe("rejected")
    expect(classifySendError({ info: { error: { code: 4001 } } })).toBe("rejected")
  })

  it("flags a missing wallet", () => {
    expect(classifySendError(new Error("no-wallet"))).toBe("no-wallet")
  })

  it("buckets everything else", () => {
    expect(classifySendError(new Error("insufficient funds"))).toBe("other")
    expect(classifySendError(null)).toBe("other")
  })
})
