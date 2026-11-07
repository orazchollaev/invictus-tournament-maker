import { Capacitor } from "@capacitor/core"
import type { StackFrame } from "@capacitor-firebase/crashlytics"

// Firebase Crashlytics wrapper. Native-only (web build no-ops). Best-effort,
// like analytics: reporting a failure must never become a second failure.
//
// Native crashes and ANRs are picked up by the SDK on its own. What it cannot
// see is the WebView — a JS throw there leaves a dead screen, not a crash — so
// those are sent here as non-fatals from the app's error nets (see logError).

const MAX_FRAMES = 30

/**
 * Turns a V8 `error.stack` into Crashlytics frames. Android WebView is always
 * Chromium, so only the V8 shape is handled:
 *
 *   at fnName (https://localhost/assets/index-abc.js:1:2345)
 *   at https://localhost/assets/index-abc.js:1:2345
 *
 * The production bundle is minified onto very few lines, so the column is the
 * part that actually locates the code. Crashlytics frames have no column field,
 * so it is kept in `fileName` (`index-abc.js:1:2345`) where it stays readable.
 */
export function parseStack(stack: string | undefined): StackFrame[] {
  if (!stack) return []
  const frames: StackFrame[] = []
  for (const raw of stack.split("\n")) {
    const line = raw.trim()
    if (!line.startsWith("at ")) continue
    const body = line.slice(3).replace(/^async /, "")
    const withName = /^(.*?) \((.+):(\d+):(\d+)\)$/.exec(body)
    const bare = withName ? null : /^(.+):(\d+):(\d+)$/.exec(body)
    const match = withName ?? bare
    if (!match) continue
    const [functionName, url, lineNo, col] = withName
      ? [withName[1], withName[2], withName[3], withName[4]]
      : ["<anonymous>", bare![1], bare![2], bare![3]]
    frames.push({
      functionName,
      fileName: `${shortFile(url)}:${lineNo}:${col}`,
      lineNumber: Number(lineNo),
    })
    if (frames.length >= MAX_FRAMES) break
  }
  return frames
}

function shortFile(url: string): string {
  const path = url.replace(/^[a-z]+:\/\/[^/]+/i, "")
  return path.slice(path.lastIndexOf("/") + 1) || path
}

// Each call imports the module and uses the plugin in place. A Capacitor plugin
// proxy answers `.then`, so returning it from an async helper would hang the
// caller (see capacitorPlugins.test.ts).
const load = () => import("@capacitor-firebase/crashlytics")

export async function recordError(where: string, error: unknown): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    const stacktrace = error instanceof Error ? parseStack(error.stack) : []
    const { FirebaseCrashlytics } = await load()
    await FirebaseCrashlytics.recordException({
      message: `[${where}] ${message}`.slice(0, 1000),
      stacktrace: stacktrace.length ? stacktrace : undefined,
      keysAndValues: [{ key: "where", value: where, type: "string" }],
    })
  } catch {
    // best-effort: silently ignore if unavailable
  }
}

/** A breadcrumb attached to whatever is reported next in this session. */
export async function breadcrumb(message: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { FirebaseCrashlytics } = await load()
    await FirebaseCrashlytics.log({ message })
  } catch {
    // best-effort: silently ignore if unavailable
  }
}

export async function setCrashKey(key: string, value: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { FirebaseCrashlytics } = await load()
    await FirebaseCrashlytics.setCustomKey({ key, value, type: "string" })
  } catch {
    // best-effort: silently ignore if unavailable
  }
}
