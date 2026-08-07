import { ref, type Ref } from "vue"
import { nextTick } from "vue"
import { toPng } from "html-to-image"
import { Capacitor } from "@capacitor/core"

export const canNativeShare =
  Capacitor.isNativePlatform() ||
  (typeof navigator !== "undefined" && typeof navigator.share === "function")

export interface BracketExportOptions {
  /** The pan layer; the `.bracket` inside it is captured when present. */
  root: Ref<HTMLElement | null>
  filename: () => string
  title: () => string
  /** Reset the view for a clean capture and return a callback that restores it. */
  freezeView: () => () => void
}

/** Renders the bracket to a PNG and shares it natively, falling back to a download. */
export function useBracketExport(options: BracketExportOptions) {
  const isExporting = ref(false)

  async function exportPng() {
    const root = options.root.value
    if (!root || isExporting.value) return

    isExporting.value = true
    const restoreView = options.freezeView()
    await nextTick()

    try {
      const el = (root.querySelector(".bracket") as HTMLElement) ?? root
      // Without explicit width/height, html-to-image falls back to measuring
      // what's actually visible: on a narrow phone the bracket is many times
      // wider than the (overflow: hidden) viewport it sits in, so only the
      // centered slice on-screen gets rasterized — every round off to either
      // side is silently cropped. scrollWidth/scrollHeight is the element's
      // full un-clipped content size, forcing the whole bracket into frame
      // regardless of how little of it is actually on-screen right now.
      const dataUrl = await toPng(el, {
        pixelRatio: 2,
        width: el.scrollWidth,
        height: el.scrollHeight,
      })
      const filename = options.filename()

      // Android's system WebView (what Capacitor apps actually run in) has no
      // Web Share API and no download manager wired to <a download> — both
      // silently no-op there. Native apps must go through the Share/Filesystem
      // plugins instead, which hand the file to a real OS share sheet.
      if (Capacitor.isNativePlatform()) {
        try {
          await shareNative(dataUrl, filename, options.title())
          return
        } catch {
          // user cancelled the native share sheet, or the plugin failed —
          // nothing more we can do on-device, fall through is pointless here.
          return
        }
      }

      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          const blob = await (await fetch(dataUrl)).blob()
          const file = new File([blob], filename, { type: "image/png" })
          const shareData = { title: options.title(), files: [file] }
          if (navigator.canShare?.(shareData)) {
            await navigator.share(shareData)
            return
          }
        } catch {
          // share cancelled or failed — fall through to download
        }
      }

      const link = document.createElement("a")
      link.download = filename
      link.href = dataUrl
      link.click()
    } finally {
      restoreView()
      isExporting.value = false
    }
  }

  /** Write the PNG to cache and hand it to the native OS share sheet. */
  async function shareNative(dataUrl: string, filename: string, title: string) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ])
    const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1)

    const written = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache,
    })

    await Share.share({ title, url: written.uri, dialogTitle: title })
  }

  return { isExporting, exportPng }
}
