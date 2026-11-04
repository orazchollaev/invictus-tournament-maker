// gzip magic bytes — used to tell a compressed payload apart from plain JSON,
// no explicit version flag needed.
const GZIP_MAGIC = [0x1f, 0x8b]

export function isGzip(bytes: Uint8Array): boolean {
  return bytes[0] === GZIP_MAGIC[0] && bytes[1] === GZIP_MAGIC[1]
}

export async function gzipCompress(text: string): Promise<ArrayBuffer> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"))
  return new Response(stream).arrayBuffer()
}

export async function gzipDecompress(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes.slice().buffer])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"))
  return new Response(stream).text()
}

/** btoa() chokes on large arrays passed via spread — chunk it. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
