/**
 * Custom team crests come from the user's own device (or a pasted URL), so a
 * gallery pick has to be normalised before it's persisted: cropped to a
 * square, downsized, and re-encoded. Teams are stored via Pinia's persisted
 * IndexedDB adapter and MAX_TEAMS can be as high as 256, so an unprocessed
 * multi-megabyte photo per team would bloat that store fast.
 */

/** Decode `file`, centre-crop it to a square, and re-encode as a small data-URL. */
export function resizeImageFile(file: File, size = 128, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("not-an-image"))
      return
    }

    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)

      const srcSize = Math.min(img.naturalWidth, img.naturalHeight)
      const sx = (img.naturalWidth - srcSize) / 2
      const sy = (img.naturalHeight - srcSize) / 2

      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("no-canvas-context"))
        return
      }
      ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size)

      // Formats that commonly carry transparency keep it (PNG); everything
      // else (JPEG, HEIC, ...) is re-encoded as JPEG for the smaller payload.
      const preserveAlpha = ["image/png", "image/webp", "image/gif"].includes(file.type)
      const mime = preserveAlpha ? "image/png" : "image/jpeg"
      resolve(canvas.toDataURL(mime, quality))
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("decode-failed"))
    }

    img.src = url
  })
}
