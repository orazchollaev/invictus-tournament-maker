import type { MonteCarloResult } from "@/engine/monteCarlo"

const _cache = new Map<string, MonteCarloResult>()

export function cacheSimResult(tournamentId: string, result: MonteCarloResult) {
  _cache.set(tournamentId, result)
}

export function getCachedSimResult(tournamentId: string): MonteCarloResult | undefined {
  return _cache.get(tournamentId)
}
