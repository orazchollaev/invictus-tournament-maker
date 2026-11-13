import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { effectScope, nextTick, ref } from "vue"
import { useProgressiveCount } from "../useProgressiveCount"

describe("useProgressiveCount", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // jsdom has no idle callbacks; the composable falls back to a timer.
    vi.stubGlobal("requestIdleCallback", undefined)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("starts at the initial count and grows by step until it covers the list", () => {
    const scope = effectScope()
    const count = scope.run(() => useProgressiveCount(() => 10, { initial: 4, step: 4 }))!
    expect(count.value).toBe(4)
    vi.advanceTimersByTime(16)
    expect(count.value).toBe(8)
    vi.advanceTimersByTime(16)
    expect(count.value).toBe(10)
    vi.advanceTimersByTime(100)
    expect(count.value).toBe(10)
    scope.stop()
  })

  it("renders a short list whole at once", () => {
    const scope = effectScope()
    const count = scope.run(() => useProgressiveCount(() => 3, { initial: 4, step: 4 }))!
    expect(count.value).toBe(3)
    scope.stop()
  })

  it("continues when the list grows and clamps when it shrinks", async () => {
    const total = ref(4)
    const scope = effectScope()
    const count = scope.run(() => useProgressiveCount(() => total.value, { initial: 4, step: 4 }))!
    expect(count.value).toBe(4)
    total.value = 12
    await nextTick()
    vi.advanceTimersByTime(16)
    expect(count.value).toBe(8)
    total.value = 2
    await nextTick()
    expect(count.value).toBe(2)
    scope.stop()
  })

  it("stops growing once its scope is disposed", () => {
    const scope = effectScope()
    const count = scope.run(() => useProgressiveCount(() => 20, { initial: 4, step: 4 }))!
    scope.stop()
    vi.advanceTimersByTime(1000)
    expect(count.value).toBe(4)
  })
})
