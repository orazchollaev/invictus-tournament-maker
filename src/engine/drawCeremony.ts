// engine/drawCeremony.ts
//
// Pure helpers for the Draw Ceremony (kura çekimi). They build the editable
// "pots" and turn (possibly user-edited) pots into a single deterministic draw
// plan: an ordered reveal `sequence` plus the `orderedIds` permutation that is
// fed straight into the existing manual-placement engine paths
// (createTournament / seedBracketFromGroups). Computing one permutation up front
// guarantees the animation and the persisted result are always identical and
// that no team can be drawn twice.

import type { Team } from "../modules/teams/types"
import type { Tournament } from "../modules/tournament/types"
import { shuffleWith } from "./utils"
import { selectWildcards } from "./groups"
import { crossPlayoffOrder } from "./tournament"

export type DrawMode = "random" | "seeded"
export type CeremonyKind = "bracket" | "group" | "playoff"

export interface Pot {
  label: string
  teamIds: string[]
}

export interface DrawStep {
  teamId: string
  potIdx: number
  targetLabel: string
}

export interface DrawPlan {
  sequence: DrawStep[]
  orderedIds: string[]
}

export interface CeremonyContext {
  kind: CeremonyKind
  teams: Team[] // participants (creation/new-season); flat qualified teams for playoff
  drawMode: DrawMode
  groupCount?: number // group kind only
}

function groupName(g: number): string {
  return `Group ${String.fromCharCode(65 + g)}`
}

// ─── Pot building ────────────────────────────────────────────────

// Initial pots for creation / new-season (bracket & group kinds).
export function buildPots(ctx: CeremonyContext): Pot[] {
  const { kind, teams, drawMode } = ctx

  if (drawMode === "random") {
    return [{ label: "Pot", teamIds: teams.map((t) => t.id) }]
  }

  const sorted = [...teams].sort((a, b) => b.power - a.power)

  if (kind === "group") {
    const gc = Math.max(2, ctx.groupCount ?? 2)
    const pots: Pot[] = []
    for (let i = 0; i < sorted.length; i += gc) {
      pots.push({
        label: `Pot ${pots.length + 1}`,
        teamIds: sorted.slice(i, i + gc).map((t) => t.id),
      })
    }
    return pots
  }

  // bracket seeded → two pots split by power
  const half = Math.ceil(sorted.length / 2)
  return [
    { label: "Pot 1", teamIds: sorted.slice(0, half).map((t) => t.id) },
    { label: "Pot 2", teamIds: sorted.slice(half).map((t) => t.id) },
  ]
}

// Pots for the group → knockout playoff draw, derived from current standings.
export function buildPlayoffPots(tournament: Tournament, teams: Team[]): Pot[] {
  if (!tournament.groups) return []
  const qpg = tournament.qualifiersPerGroup ?? 2
  const wc = tournament.wildcardCount ?? 0
  const pots: Pot[] = []
  for (let p = 0; p < qpg; p++) {
    const ids = tournament.groups
      .map((g) => g.standings[p]?.teamId)
      .filter((id): id is string => !!id)
    if (ids.length) pots.push({ label: rankLabel(p), teamIds: ids })
  }
  if (wc > 0) {
    const wcIds = selectWildcards(tournament.groups, qpg, wc, teams).map((w) => w.team.id)
    if (wcIds.length) pots.push({ label: "Wildcards", teamIds: wcIds })
  }
  return pots
}

function rankLabel(p: number): string {
  if (p === 0) return "Group Winners"
  if (p === 1) return "Runners-up"
  return `Rank ${p + 1}`
}

// ─── Validation ──────────────────────────────────────────────────

// Returns i18n-key suffixes for any problems; empty array = ready to draw.
export function validatePots(pots: Pot[], expectedTeamCount: number): string[] {
  const errors: string[] = []
  const all = pots.flatMap((p) => p.teamIds)
  if (all.length !== expectedTeamCount) errors.push("unassigned")
  if (new Set(all).size !== all.length) errors.push("duplicate")
  if (pots.length > 1 && pots.some((p) => p.teamIds.length === 0)) errors.push("emptyPot")
  return errors
}

// ─── Draw plan ───────────────────────────────────────────────────

export function computeDrawPlan(pots: Pot[], ctx: CeremonyContext, rng: () => number): DrawPlan {
  if (ctx.kind === "group") {
    return groupPlan(pots, Math.max(2, ctx.groupCount ?? 2), rng)
  }
  return bracketPlan(pots, ctx.drawMode, rng)
}

function groupPlan(pots: Pot[], gc: number, rng: () => number): DrawPlan {
  const total = pots.reduce((n, p) => n + p.teamIds.length, 0)
  const base = Math.floor(total / gc)
  const extra = total % gc
  const slotsFor = (g: number) => (g < extra ? base + 1 : base)

  const groupSlots: string[][] = Array.from({ length: gc }, () => [])
  const sequence: DrawStep[] = []
  let gIdx = 0

  for (let p = 0; p < pots.length; p++) {
    const ids = shuffleWith(pots[p].teamIds, rng)
    for (const id of ids) {
      // find next group (cycling from gIdx) that still has a free slot
      for (let tries = 0; tries < gc; tries++) {
        const g = gIdx % gc
        if (groupSlots[g].length < slotsFor(g)) {
          groupSlots[g].push(id)
          sequence.push({ teamId: id, potIdx: p, targetLabel: groupName(g) })
          gIdx = (g + 1) % gc
          break
        }
        gIdx = (g + 1) % gc
      }
    }
  }

  // Interleave slot-by-slot across groups → matches engine round-robin
  // distribution (orderedTeams[i] → group i % gc).
  const maxSlots = Math.max(0, ...groupSlots.map((g) => g.length))
  const orderedIds: string[] = []
  for (let slot = 0; slot < maxSlots; slot++) {
    for (let g = 0; g < gc; g++) {
      const id = groupSlots[g][slot]
      if (id) orderedIds.push(id)
    }
  }

  return { sequence, orderedIds }
}

// Deterministic playoff plan for the "cross" seed mode: no RNG, no editable
// pots. Reveals the rotating cross matchups (A1–B2, B1–C2, …) in the same order
// that seedBracketFromGroups builds the bracket, so the animation and the
// committed result are always identical. `orderedIds` is fed back through the
// normal "manual" completion path, whose bye-front packing matches this layout.
export function computeCrossDrawPlan(tournament: Tournament, teams: Team[]): DrawPlan {
  const order = crossPlayoffOrder(tournament, teams)
  if (!order) return { sequence: [], orderedIds: [] }
  const { ids, byeCount } = order

  const pots = buildPlayoffPots(tournament, teams)
  const potOf = new Map<string, number>()
  pots.forEach((p, i) => p.teamIds.forEach((id) => potOf.set(id, i)))

  const sequence: DrawStep[] = []
  for (let i = 0; i < byeCount; i++) {
    sequence.push({ teamId: ids[i], potIdx: potOf.get(ids[i]) ?? 0, targetLabel: `BYE ${i + 1}` })
  }
  let matchNo = 1
  for (let i = byeCount; i < ids.length; i += 2) {
    const home = ids[i]
    const away = ids[i + 1]
    sequence.push({ teamId: home, potIdx: potOf.get(home) ?? 0, targetLabel: `Match ${matchNo}` })
    if (away) {
      sequence.push({ teamId: away, potIdx: potOf.get(away) ?? 0, targetLabel: `Match ${matchNo}` })
    }
    matchNo++
  }

  return { sequence, orderedIds: ids }
}

function bracketPlan(pots: Pot[], mode: DrawMode, rng: () => number): DrawPlan {
  const potOf = new Map<string, number>()
  pots.forEach((p, i) => p.teamIds.forEach((id) => potOf.set(id, i)))

  // Seed order: pot order is the seeding (strong → weak); shuffle within each
  // pot for variety. Random mode shuffles everything together.
  const seedOrder =
    mode === "random"
      ? shuffleWith(
          pots.flatMap((p) => p.teamIds),
          rng
        )
      : pots.flatMap((p) => shuffleWith(p.teamIds, rng))

  const count = seedOrder.length
  const size = Math.pow(2, Math.ceil(Math.log2(Math.max(count, 2))))
  const byes = size - count

  const byeTeams = seedOrder.slice(0, byes)
  const rest = seedOrder.slice(byes)

  const orderedIds: string[] = [...byeTeams]
  const sequence: DrawStep[] = byeTeams.map((id, i) => ({
    teamId: id,
    potIdx: potOf.get(id) ?? 0,
    targetLabel: `BYE ${i + 1}`,
  }))

  const half = Math.floor(rest.length / 2)
  for (let i = 0; i < half; i++) {
    const home = rest[i]
    const away = rest[rest.length - 1 - i]
    const matchNo = byes + i + 1
    orderedIds.push(home, away)
    sequence.push({ teamId: home, potIdx: potOf.get(home) ?? 0, targetLabel: `Match ${matchNo}` })
    sequence.push({ teamId: away, potIdx: potOf.get(away) ?? 0, targetLabel: `Match ${matchNo}` })
  }

  return { sequence, orderedIds }
}
