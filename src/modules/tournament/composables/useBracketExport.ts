import { ref, type Ref } from "vue"
import { nextTick } from "vue"
import { toPng } from "html-to-image"

export const canNativeShare =
  typeof navigator !== "undefined" && typeof navigator.share === "function"

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
      const dataUrl = await toPng(el, { pixelRatio: 2 })
      const filename = options.filename()

      if (canNativeShare) {
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

  return { isExporting, exportPng }
}
