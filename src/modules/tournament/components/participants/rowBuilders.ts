import type { Team } from "@/modules/teams/types"
import type { Tournament } from "@/modules/tournament/types"
import { getLeaguePlayoffData, getLoserId, getWinnerId, isLeagueLike } from "@/engine"
import { EMPTY_STATS, NO_FINISH, type ParticipantRow, type TeamStats } from "./types"

/** Rows sort after every ranked team when the tournament gives them no placing. */
const UNRANKED = 9999
/** Playoff/bracket exits live in their own band above league placings. */
const BRACKET_BAND = 1000

type Finish = Partial<ParticipantRow>

/**
 * Context resolved once per tournament and reused for every team, so the
 * per-team builders stay cheap and free of repeated lookups.
 */
export interface FinishContext {
  tournament: Tournament
  secondPlaceId: string | null
  thirdPlaceId: string | null
  fourthPlaceId: string | null
  /** A league's playoff bracket has been seeded, so finishes come from it. */
  playoffActive: boolean
}

export function buildFinishContext(t: Tournament): FinishContext {
  const tpMatch = t.thirdPlaceMatch
  const finalMatch = t.rounds[t.rounds.length - 1]?.matches[0]

  return {
    tournament: t,
    secondPlaceId: finalMatch ? getLoserId(finalMatch) : null,
    thirdPlaceId: tpMatch ? getWinnerId(tpMatch) : null,
    fourthPlaceId: tpMatch ? getLoserId(tpMatch) : null,
    playoffActive: isLeagueLike(t) && t.rounds.length > 0 && !!getLeaguePlayoffData(t)?.started,
  }
}

/** The round in which `teamId` lost, searching from the earliest round. */
function eliminationRound(t: Tournament, teamId: string): { name: string; idx: number } | null {
  for (let ri = 0; ri < t.rounds.length; ri++) {
    const round = t.rounds[ri]
    for (const match of round.matches) {
      if ((match.homeId !== teamId && match.awayId !== teamId) || !match.result) continue
      const winnerId = getWinnerId(match)
      if (winnerId && winnerId !== teamId) return { name: round.name, idx: ri }
    }
  }
  return null
}

/**
 * A league qualifier's playoff result, layered on top of the regular-season
 * table. Returns null for teams that never made the playoff.
 */
function playoffFinish(ctx: FinishContext, teamId: string): Finish | null {
  if (!ctx.playoffActive) return null
  const t = ctx.tournament

  const inBracket = t.rounds[0]?.matches.some((m) => m.homeId === teamId || m.awayId === teamId)
  if (!inBracket) return null

  if (t.winnerId === teamId) return { isWinner: true }
  if (ctx.secondPlaceId === teamId) return { isSecondPlace: true }

  const elim = eliminationRound(t, teamId)
  if (elim) return { eliminatedRound: elim.name, eliminatedRoundIdx: BRACKET_BAND + elim.idx }
  return null
}

/** Position within a multi-tier league, counted across tiers top-down. */
function tierPlacing(t: Tournament, teamId: string) {
  let globalOffset = 0
  for (const tier of t.tiers ?? []) {
    const posIdx = tier.league.standings.findIndex((s) => s.teamId === teamId)
    if (posIdx !== -1) {
      return {
        leaguePosition: globalOffset + posIdx + 1,
        posInTier: posIdx + 1,
        tierLabel: tier.name,
      }
    }
    globalOffset += tier.teamIds.length
  }
  return { leaguePosition: null, posInTier: null, tierLabel: null }
}

function leagueFinish(ctx: FinishContext, teamId: string): Finish {
  const t = ctx.tournament

  const playoff = playoffFinish(ctx, teamId)
  if (playoff) return playoff

  const placing = t.tiers?.length
    ? tierPlacing(t, teamId)
    : {
        leaguePosition: (() => {
          const posIdx = t.league?.standings.findIndex((s) => s.teamId === teamId) ?? -1
          return posIdx !== -1 ? posIdx + 1 : null
        })(),
        posInTier: null,
        tierLabel: null,
      }

  return {
    isWinner: t.winnerId === teamId,
    ...placing,
    eliminatedRoundIdx: placing.leaguePosition ?? UNRANKED,
  }
}

function groupBracketFinish(ctx: FinishContext, teamId: string): Finish {
  const t = ctx.tournament

  if (t.groupsDone) {
    const elim = eliminationRound(t, teamId)
    if (elim) return { eliminatedRound: elim.name, eliminatedRoundIdx: BRACKET_BAND + elim.idx }
  }

  const qualified = t.groupsDone
    ? !!t.rounds[0]?.matches.some((m) => m.homeId === teamId || m.awayId === teamId)
    : false

  const group = t.groups?.find((g) => g.teamIds.includes(teamId))
  if (group && !qualified && group.matches.every((m) => m.result !== null)) {
    return { eliminatedRound: group.name }
  }

  return {}
}

/** Where a single team finished, for whichever format the tournament uses. */
export function buildFinish(ctx: FinishContext, teamId: string): Finish {
  const t = ctx.tournament

  // Swiss finishes off the same single table as a league.
  if (isLeagueLike(t) && (t.tiers?.length || t.league)) {
    return leagueFinish(ctx, teamId)
  }

  if (t.winnerId === teamId) return { isWinner: true }
  if (ctx.secondPlaceId === teamId) return { isSecondPlace: true }
  // -2 keeps the third-place pair ahead of everyone knocked out earlier.
  if (ctx.thirdPlaceId === teamId) return { isThirdPlace: true, eliminatedRoundIdx: -2 }
  if (ctx.fourthPlaceId === teamId) return { isFourthPlace: true, eliminatedRoundIdx: -2 }

  if (t.format === "group+bracket") return groupBracketFinish(ctx, teamId)

  const elim = eliminationRound(t, teamId)
  return elim ? { eliminatedRound: elim.name, eliminatedRoundIdx: elim.idx } : {}
}

export function buildRow(
  ctx: FinishContext,
  team: Team,
  stats: TeamStats | undefined
): ParticipantRow {
  return {
    team,
    groupName: ctx.tournament.groups?.find((g) => g.teamIds.includes(team.id))?.name ?? null,
    stats: stats ?? { ...EMPTY_STATS },
    ...NO_FINISH,
    ...buildFinish(ctx, team.id),
  }
}
