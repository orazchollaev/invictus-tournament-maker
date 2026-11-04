import { base64ToBytes, bytesToBase64, gzipCompress, gzipDecompress } from "@/lib/gzip"
import { MARKET_LIMITS } from "../constants"
import type { MarketDataset } from "../types"
import { validateDataset } from "./validateDataset"

/** Dataset → gzip → base64 string, ready to store in one Firestore field. */
export async function encodeDataset(dataset: MarketDataset): Promise<string> {
  const clean = validateDataset(dataset)
  if (!clean) throw new Error("invalid-dataset")
  const packed = bytesToBase64(new Uint8Array(await gzipCompress(JSON.stringify(clean))))
  if (packed.length > MARKET_LIMITS.maxPayloadChars) throw new Error("too-large")
  return packed
}

/**
 * Inverse of `encodeDataset`, for data that came off the network. Anything
 * that does not decode or does not pass validation yields null — never a
 * half-loaded dataset.
 */
export async function decodeDataset(payload: unknown): Promise<MarketDataset | null> {
  if (typeof payload !== "string" || payload.length > MARKET_LIMITS.maxPayloadChars) return null
  try {
    return validateDataset(JSON.parse(await gzipDecompress(base64ToBytes(payload))))
  } catch {
    return null
  }
}
