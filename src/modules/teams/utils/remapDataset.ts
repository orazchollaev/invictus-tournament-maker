/**
 * Adds a dataset on top of what is already loaded without overwriting it.
 *
 * A dataset's own ids are namespaced (e.g. "afc-01") so they normally never
 * collide, but the same dataset can be loaded twice, and a shared one carries
 * ids from someone else's device. Any team id already taken gets a fresh one,
 * and the squad's `teamId` follows it. `idMap` lists what was renamed, for
 * anything else that references team ids (a dataset's own tournaments).
 */
export function remapDatasetIds<T extends { id: string }, P extends { teamId: string }>(
  teams: readonly T[],
  players: readonly P[],
  existingIds: ReadonlySet<string>,
  newId: () => string
): { teams: T[]; players: P[]; idMap: Map<string, string> } {
  const idMap = new Map<string, string>()
  const outTeams = teams.map((team) => {
    if (!existingIds.has(team.id)) return team
    const id = newId()
    idMap.set(team.id, id)
    return { ...team, id }
  })
  const outPlayers = players.map((p) =>
    idMap.has(p.teamId) ? { ...p, teamId: idMap.get(p.teamId) as string } : p
  )
  return { teams: outTeams, players: outPlayers, idMap }
}
