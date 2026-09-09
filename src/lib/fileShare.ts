// lib/fileShare.ts
//
// Handing a generated file to the user, on every platform the app runs on.
//
// Android's system WebView — what a Capacitor build actually runs in — has no
// download manager wired to `<a download>` and no Web Share API, so both
// silently no-op there. A native build has to write the bytes to cache and
// pass the URI to the OS share sheet instead. The browser keeps the two web
// routes: Share when it can take files, a download link when it cannot.
import { Capacitor } from "@capacitor/core"

export interface SaveFileOptions {
  /** The file itself. */
  blob: Blob
  filename: string
  /** Shown as the share sheet's title. Defaults to the filename. */
  title?: string
}

/** Base64 without the `data:` prefix — what the Filesystem plugin wants. */
async function toBase64(blob: Blob): Promise<string> {
  const buffer = new Uint8Array(await blob.arrayBuffer())
  let binary = ""
  // Chunked, because spreading a multi-megabyte array into apply() overflows
  // the call stack on exactly the large exports that need this most.
  const CHUNK = 0x8000
  for (let i = 0; i < buffer.length; i += CHUNK) {
    binary += String.fromCharCode(...buffer.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

async function shareNative(blob: Blob, filename: string, title: string): Promise<void> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ])
  // No `encoding` option — that would write the base64 text itself as the
  // file's contents rather than the bytes it stands for.
  const written = await Filesystem.writeFile({
    path: filename,
    data: await toBase64(blob),
    directory: Directory.Cache,
  })
  await Share.share({ title, url: written.uri, dialogTitle: title })
}

/**
 * Save a generated file, whichever way this platform allows.
 *
 * Resolves once the file has been handed over — or once the user has walked
 * away from the share sheet, which is not an error worth surfacing.
 */
export async function saveFile({ blob, filename, title }: SaveFileOptions): Promise<void> {
  const shareTitle = title ?? filename

  if (Capacitor.isNativePlatform()) {
    try {
      await shareNative(blob, filename, shareTitle)
    } catch {
      // Cancelled share sheet, or the plugin failed — there is no second
      // route on-device, so there is nothing to fall through to.
    }
    return
  }

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      const file = new File([blob], filename, { type: blob.type })
      const shareData = { title: shareTitle, files: [file] }
      if (navigator.canShare?.(shareData)) {
        await navigator.share(shareData)
        return
      }
    } catch {
      // Share cancelled or unsupported — fall through to the download.
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
