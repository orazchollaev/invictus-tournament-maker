// engine/monteCarlo.ts
import type { Team } from "../modules/teams/types"
import type { Tournament } from "../modules/tournament/types"
import { simulateMatch, simulatePenaltyShootout } from "./simulation"
import { getWinnerId, propagateWinners } from "./bracket"
import { simulateAllGroups } from "./groups"
import { seedBracketFromGroups } from "./tournament"
import { recalcLeagueStandings } from "./league"

export interface TeamSimStats {
  teamId: string
  wins: number
  runnerUp: number
  top4: number
  groupAdvanced: number
  totalPoints: number
  totalGF: number
  totalGA: number
  topThree: number
  relegated: number
}

export interface MonteCarloResult {
  runs: number
  format: string
  teamStats: TeamSimStats[]
  relegationCount: number
  hasGroups: boolean
  bracketRounds: number
}

function simDoubleLegInPlace(match: any, teams: Team[]) {
  if (!match.homeId || !match.awayId) return
  if (!match.result) {
    match.result = simulateMatch(match, teams)
  }
  if (match.leg2Result === null) {
    const leg2 = { id: match.id, homeId: match.awayId, awayId: match.homeId }
    const r2 = simulateMatch(leg2 as any, teams)
    const aggHome = match.result.home + r2.away
    const aggAway = match.result.away + r2.home
    if (aggHome !== aggAway) {
      match.leg2Result = r2
    } else {
      const pen = simulatePenaltyShootout(leg2 as any, teams)
      match.leg2Result = { ...r2, penHome: pen.penHome, penAway: pen.penAway }
    }
  }
}

function simBracketInPlace(
  t: Tournament,
  teams: Team[]
): { winnerId: string | null; runnerUpId: string | null; top4Ids: string[] } {
  const rounds = t.rounds
  for (let r = 0; r < rounds.length; r++) {
    propagateWinners(rounds, teams)
    rounds[r].matches.forEach((match) => {
      if (!match.homeId || !match.awayId) return
      if (match.leg2Result !== undefined) {
        simDoubleLegInPlace(match, teams)
      } else if (!match.result) {
        const result = simulateMatch(match, teams)
        match.result =
          result.home === result.away
            ? { ...result, ...simulatePenaltyShootout(match, teams) }
            : result
      }
    })
  }
  propagateWinners(rounds, teams)

  const final = rounds[rounds.length - 1]?.matches[0]
  const winnerId = final ? getWinnerId(final) : null
  const runnerUpId = winnerId ? (final.homeId === winnerId ? final.awayId : final.homeId) : null

  const top4Ids: string[] = []
  if (rounds.length >= 3) {
    for (const m of rounds[rounds.length - 2].matches) {
      if (m.homeId) top4Ids.push(m.homeId)
      if (m.awayId) top4Ids.push(m.awayId)
    }
  }

  return { winnerId, runnerUpId, top4Ids }
}

function resetForRun(t: Tournament) {
  if (t.format === "bracket") {
    for (let r = 0; r < t.rounds.length; r++) {
      for (const m of t.rounds[r].matches) {
        if (r > 0) {
          m.homeId = null
          m.awayId = null
          m.result = null
          if (m.leg2Result !== undefined) m.leg2Result = null
        } else {
          const isBye = (m.homeId && !m.awayId) || (!m.homeId && m.awayId)
          if (!isBye) {
            m.result = null
            if (m.leg2Result !== undefined) m.leg2Result = null
          }
        }
      }
    }
  } else if (t.format === "group+bracket") {
    t.groupsDone = false
    t.rounds = []
    for (const g of t.groups ?? []) {
      for (const m of g.matches) m.result = null
      g.standings.forEach((s) => {
        s.played = s.won = s.drawn = s.lost = s.gf = s.ga = s.gd = s.pts = 0
      })
    }
  } else if (t.format === "league") {
    if (t.league) {
      for (const md of t.league.matchdays) {
        for (const m of md.matches) m.result = null
      }
      t.league.standings.forEach((s) => {
        s.played = s.won = s.drawn = s.lost = s.gf = s.ga = s.gd = s.pts = 0
      })
    }
    if (t.tiers) {
      for (const tier of t.tiers) {
        for (const md of tier.league.matchdays) {
          for (const m of md.matches) m.result = null
        }
        tier.league.standings.forEach((s) => {
          s.played = s.won = s.drawn = s.lost = s.gf = s.ga = s.gd = s.pts = 0
        })
      }
    }
  }
  t.winnerId = null
}

function runOnce(
  t: Tournament,
  teams: Team[],
  stats: Map<string, TeamSimStats>,
  relegationCount: number
) {
  if (t.format === "bracket") {
    const { winnerId, runnerUpId, top4Ids } = simBracketInPlace(t, teams)
    if (winnerId) {
      const s = stats.get(winnerId)
      if (s) s.wins++
    }
    if (runnerUpId) {
      const s = stats.get(runnerUpId)
      if (s) s.runnerUp++
    }
    for (const id of top4Ids) {
      const s = stats.get(id)
      if (s) s.top4++
    }
  } else if (t.format === "group+bracket") {
    simulateAllGroups(t, teams)
    seedBracketFromGroups(t, teams, t.playoffSeedMode ?? "cross")

    for (const m of t.rounds[0]?.matches ?? []) {
      if (m.homeId) {
        const s = stats.get(m.homeId)
        if (s) s.groupAdvanced++
      }
      if (m.awayId) {
        const s = stats.get(m.awayId)
        if (s) s.groupAdvanced++
      }
    }

    const { winnerId, runnerUpId, top4Ids } = simBracketInPlace(t, teams)
    if (winnerId) {
      const s = stats.get(winnerId)
      if (s) s.wins++
    }
    if (runnerUpId) {
      const s = stats.get(runnerUpId)
      if (s) s.runnerUp++
    }
    for (const id of top4Ids) {
      const s = stats.get(id)
      if (s) s.top4++
    }
  } else if (t.format === "league") {
    if (t.tiers?.length) {
      for (const tier of t.tiers) {
        for (const md of tier.league.matchdays) {
          for (const m of md.matches) {
            if (!m.result) m.result = simulateMatch(m as any, teams)
          }
        }
        recalcLeagueStandings(tier.league, t.tiebreaker)
      }
      const topTier = t.tiers[0].league.standings
      const n = topTier.length
      topTier.forEach((s, rank) => {
        const st = stats.get(s.teamId)
        if (!st) return
        if (rank === 0) st.wins++
        if (rank < 3) st.topThree++
        st.totalPoints += s.pts
        st.totalGF += s.gf
        st.totalGA += s.ga
        if (relegationCount > 0 && rank >= n - relegationCount) st.relegated++
      })
    } else if (t.league) {
      for (const md of t.league.matchdays) {
        for (const m of md.matches) {
          if (!m.result) m.result = simulateMatch(m as any, teams)
        }
      }
      recalcLeagueStandings(t.league, t.tiebreaker)
      const n = t.league.standings.length
      t.league.standings.forEach((s, rank) => {
        const st = stats.get(s.teamId)
        if (!st) return
        if (rank === 0) st.wins++
        if (rank < 3) st.topThree++
        st.totalPoints += s.pts
        st.totalGF += s.gf
        st.totalGA += s.ga
        if (relegationCount > 0 && rank >= n - relegationCount) st.relegated++
      })
    }
  }
}

function buildTemplate(tournament: Tournament): Tournament {
  const clone = JSON.parse(JSON.stringify(tournament)) as Tournament
  if (clone.format === "bracket") {
    for (let r = 0; r < clone.rounds.length; r++) {
      for (const m of clone.rounds[r].matches) {
        if (r > 0) {
          m.homeId = null
          m.awayId = null
          m.result = null
          if (m.leg2Result !== undefined) m.leg2Result = null
        } else {
          const isBye = (m.homeId && !m.awayId) || (!m.homeId && m.awayId)
          if (!isBye) {
            m.result = null
            if (m.leg2Result !== undefined) m.leg2Result = null
          }
        }
      }
    }
  } else if (clone.format === "group+bracket") {
    clone.groupsDone = false
    clone.rounds = []
    for (const g of clone.groups ?? []) {
      for (const m of g.matches) m.result = null
      g.standings.forEach((s) => {
        s.played = s.won = s.drawn = s.lost = s.gf = s.ga = s.gd = s.pts = 0
      })
    }
  } else if (clone.format === "league") {
    if (clone.league) {
      for (const md of clone.league.matchdays) {
        for (const m of md.matches) m.result = null
      }
      clone.league.standings.forEach((s) => {
        s.played = s.won = s.drawn = s.lost = s.gf = s.ga = s.gd = s.pts = 0
      })
    }
    if (clone.tiers) {
      for (const tier of clone.tiers) {
        for (const md of tier.league.matchdays) {
          for (const m of md.matches) m.result = null
        }
        tier.league.standings.forEach((s) => {
          s.played = s.won = s.drawn = s.lost = s.gf = s.ga = s.gd = s.pts = 0
        })
      }
    }
  }
  clone.winnerId = null
  return clone
}

function getBracketRounds(tournament: Tournament): number {
  if (tournament.format === "bracket") return tournament.rounds.length
  if (tournament.format === "group+bracket") {
    const qpg = tournament.qualifiersPerGroup ?? 2
    const gc = tournament.groups?.length ?? 2
    const wc = tournament.wildcardCount ?? 0
    const total = qpg * gc + wc
    return Math.ceil(Math.log2(Math.max(total, 2))) + 1
  }
  return 0
}

export async function runMonteCarloSimulations(
  tournament: Tournament,
  teams: Team[],
  n: number,
  onProgress: (completed: number) => void,
  cancelSignal: { cancelled: boolean }
): Promise<MonteCarloResult | null> {
  const template = buildTemplate(tournament)
  const relegationCount = tournament.relegationCount ?? 0

  const statsMap = new Map<string, TeamSimStats>()
  for (const teamId of tournament.teamIds) {
    statsMap.set(teamId, {
      teamId,
      wins: 0,
      runnerUp: 0,
      top4: 0,
      groupAdvanced: 0,
      totalPoints: 0,
      totalGF: 0,
      totalGA: 0,
      topThree: 0,
      relegated: 0,
    })
  }

  const BATCH = 250
  let completed = 0

  while (completed < n) {
    if (cancelSignal.cancelled) return null

    const end = Math.min(completed + BATCH, n)
    for (let i = completed; i < end; i++) {
      resetForRun(template)
      runOnce(template, teams, statsMap, relegationCount)
    }
    completed = end
    onProgress(completed)

    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }

  return {
    runs: n,
    format: tournament.format,
    teamStats: Array.from(statsMap.values()),
    relegationCount,
    hasGroups: tournament.format === "group+bracket",
    bracketRounds: getBracketRounds(tournament),
  }
}
