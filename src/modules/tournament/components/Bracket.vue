<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from "vue"
import type { Tournament, Match } from "../types"
import type { Team } from "@/modules/teams/types"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import { getWinnerId } from "@/engine/logic"

const props = defineProps<{ tournament: Tournament; teams: Team[] }>()
const emit = defineEmits<{
  "set-result": [round: number, match: number, home: number, away: number]
  "sim-match": [round: number, match: number]
}>()

const editingMatch = ref<string | null>(null)
const editHome = ref(0)
const editAway = ref(0)

function startEdit(match: Match) {
  editingMatch.value = match.id
  editHome.value = match.result?.home ?? 0
  editAway.value = match.result?.away ?? 0
}

function saveResult(origRound: number, origMatch: number, _match: Match) {
  if (editHome.value === editAway.value) return
  emit("set-result", origRound, origMatch, editHome.value, editAway.value)
  editingMatch.value = null
}

function isWinner(match: Match, teamId: string | null) {
  if (!match.result || !teamId) return false
  return getWinnerId(match) === teamId
}

// --- Split bracket data ---

interface DisplayMatch extends Match {
  _origRound: number
  _origMatch: number
}

const allRounds = computed(() => props.tournament.rounds)
const nonFinalRounds = computed(() => allRounds.value.slice(0, -1))
const finalRound = computed(() => allRounds.value[allRounds.value.length - 1])

const finalMatch = computed(
  (): DisplayMatch => ({
    ...finalRound.value.matches[0],
    _origRound: allRounds.value.length - 1,
    _origMatch: 0,
  })
)

// Left: each non-final round's first half, outer→inner
const leftRounds = computed((): DisplayMatch[][] =>
  nonFinalRounds.value.map((r, ri) =>
    r.matches.slice(0, r.matches.length / 2).map((m, mi) => ({
      ...m,
      _origRound: ri,
      _origMatch: mi,
    }))
  )
)

// Right: each non-final round's second half reversed, then rounds reversed (inner→outer)
const rightRounds = computed((): DisplayMatch[][] =>
  [...nonFinalRounds.value]
    .map((r, ri) => {
      const total = r.matches.length
      return r.matches
        .slice(total / 2)
        .reverse()
        .map((m, di) => ({
          ...m,
          _origRound: ri,
          _origMatch: total - 1 - di,
        }))
    })
    .reverse()
)

// Round names for right side (inner→outer = reverse of nonFinalRounds)
function rightRoundName(ri: number) {
  const origIndex = nonFinalRounds.value.length - 1 - ri
  return nonFinalRounds.value[origIndex]?.name ?? ""
}

// --- Refs ---
const leftMatchRefs: Record<number, Record<number, HTMLElement>> = {}
const rightMatchRefs: Record<number, Record<number, HTMLElement>> = {}
const leftConnRefs: Record<number, HTMLElement> = {}
const rightConnRefs: Record<number, HTMLElement> = {}
function setLeftRef(el: Element | null, li: number, mi: number) {
  if (!el) return
  if (!leftMatchRefs[li]) leftMatchRefs[li] = {}
  leftMatchRefs[li][mi] = el as HTMLElement
}
function setRightRef(el: Element | null, ri: number, mi: number) {
  if (!el) return
  if (!rightMatchRefs[ri]) rightMatchRefs[ri] = {}
  rightMatchRefs[ri][mi] = el as HTMLElement
}
function setLeftConnRef(el: Element | null, li: number) {
  if (el) leftConnRefs[li] = el as HTMLElement
}
function setRightConnRef(el: Element | null, ri: number) {
  if (el) rightConnRefs[ri] = el as HTMLElement
}

function midY(el: HTMLElement, ref: DOMRect): number {
  const r = el.getBoundingClientRect()
  return (r.top + r.bottom) / 2 - ref.top
}

function makeSvg(paths: string[]): string {
  return `<svg width="100%" height="100%" style="display:block;overflow:visible">${paths
    .map((d) => `<path d="${d}" fill="none" stroke="var(--border)" stroke-width="1"/>`)
    .join("")}</svg>`
}

function drawConnectors() {
  const nLeft = leftRounds.value.length

  // Left connectors
  for (let li = 0; li < nLeft; li++) {
    const connEl = leftConnRefs[li]
    if (!connEl) continue
    const rect = connEl.getBoundingClientRect()
    const w = rect.width
    const mid = w / 2
    const paths: string[] = []

    if (li < nLeft - 1) {
      // Standard branching connector
      leftRounds.value[li + 1].forEach((_, ci) => {
        const srcA = leftMatchRefs[li]?.[ci * 2]
        const srcB = leftMatchRefs[li]?.[ci * 2 + 1]
        const dst = leftMatchRefs[li + 1]?.[ci]
        if (!srcA || !srcB || !dst) return
        const ay = midY(srcA, rect)
        const by = midY(srcB, rect)
        const dy = midY(dst, rect)
        paths.push(`M0 ${ay} H${mid} V${by} H0`)
        paths.push(`M${mid} ${dy} H${w}`)
      })
    } else {
      // SF-left → Final (simple horizontal line)
      const src = leftMatchRefs[li]?.[0]
      if (src) {
        const sy = midY(src, rect)
        paths.push(`M0 ${sy} H${w}`)
      }
    }
    connEl.innerHTML = makeSvg(paths)
  }

  // Right connectors
  const nRight = rightRounds.value.length
  for (let ri = 0; ri < nRight; ri++) {
    const connEl = rightConnRefs[ri]
    if (!connEl) continue
    const rect = connEl.getBoundingClientRect()
    const w = rect.width
    const mid = w / 2
    const paths: string[] = []

    if (ri === 0) {
      // Final → SF-right (simple horizontal line)
      const dst = rightMatchRefs[0]?.[0]
      if (dst) {
        const dy = midY(dst, rect)
        paths.push(`M0 ${dy} H${w}`)
      }
    } else {
      // Mirrored branching connector: inner (left) → outer (right)
      rightRounds.value[ri - 1].forEach((_, ci) => {
        const srcA = rightMatchRefs[ri]?.[ci * 2]
        const srcB = rightMatchRefs[ri]?.[ci * 2 + 1]
        const dst = rightMatchRefs[ri - 1]?.[ci]
        if (!srcA || !srcB || !dst) return
        const ay = midY(srcA, rect)
        const by = midY(srcB, rect)
        const dy = midY(dst, rect)
        paths.push(`M${w} ${ay} H${mid} V${by} H${w}`)
        paths.push(`M${mid} ${dy} H0`)
      })
    }
    connEl.innerHTML = makeSvg(paths)
  }
}

watch(
  () => props.tournament,
  async () => {
    await nextTick()
    drawConnectors()
  },
  { deep: true }
)
onMounted(async () => {
  await nextTick()
  drawConnectors()
})
onUnmounted(() => window.removeEventListener("resize", drawConnectors))
window.addEventListener("resize", drawConnectors)
</script>

<template>
  <div class="bracket-wrap">
    <div class="bracket">
      <!-- LEFT SIDE: outer → inner -->
      <template v-for="(leftHalf, li) in leftRounds" :key="'left-' + li">
        <div class="round-col">
          <div class="round-title">{{ nonFinalRounds[li].name }}</div>
          <div class="matches-col">
            <div
              v-for="(match, mi) in leftHalf"
              :key="match.id"
              :ref="(el) => setLeftRef(el as Element | null, li, mi)"
              class="match-card"
            >
              <div class="match-row" :class="{ winner: isWinner(match, match.homeId) }">
                <TeamBadge :team-id="match.homeId" :teams="teams" />
                <span v-if="match.result !== null" class="score">{{ match.result.home }}</span>
                <span v-else class="score tbd">-</span>
              </div>
              <div class="match-row" :class="{ winner: isWinner(match, match.awayId) }">
                <TeamBadge :team-id="match.awayId" :teams="teams" />
                <span v-if="match.result !== null" class="score">{{ match.result.away }}</span>
                <span v-else class="score tbd">-</span>
              </div>
              <div v-if="match.homeId && match.awayId" class="match-actions">
                <template v-if="editingMatch === match.id">
                  <input v-model.number="editHome" type="number" min="0" class="score-input" />
                  <span>–</span>
                  <input v-model.number="editAway" type="number" min="0" class="score-input" />
                  <button
                    class="primary btn-xs"
                    @click="saveResult(match._origRound, match._origMatch, match)"
                  >
                    OK
                  </button>
                  <button class="btn-xs" @click="editingMatch = null">✕</button>
                </template>
                <template v-else>
                  <button class="btn-xs" @click="startEdit(match)">
                    {{ match.result ? "Edit" : "Set score" }}
                  </button>
                  <button
                    class="btn-xs"
                    @click="emit('sim-match', match._origRound, match._origMatch)"
                  >
                    🎲
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
        <div :ref="(el) => setLeftConnRef(el as Element | null, li)" class="conn-col" />
      </template>

      <!-- FINAL -->
      <div class="round-col final-col">
        <div class="round-title">{{ finalRound.name }}</div>
        <div class="matches-col">
          <div class="match-card">
            <div class="match-row" :class="{ winner: isWinner(finalMatch, finalMatch.homeId) }">
              <TeamBadge :team-id="finalMatch.homeId" :teams="teams" />
              <span v-if="finalMatch.result !== null" class="score">
                {{ finalMatch.result.home }}
              </span>
              <span v-else class="score tbd">-</span>
            </div>
            <div class="match-row" :class="{ winner: isWinner(finalMatch, finalMatch.awayId) }">
              <TeamBadge :team-id="finalMatch.awayId" :teams="teams" />
              <span v-if="finalMatch.result !== null" class="score">
                {{ finalMatch.result.away }}
              </span>
              <span v-else class="score tbd">-</span>
            </div>
            <div v-if="finalMatch.homeId && finalMatch.awayId" class="match-actions">
              <template v-if="editingMatch === finalMatch.id">
                <input v-model.number="editHome" type="number" min="0" class="score-input" />
                <span>–</span>
                <input v-model.number="editAway" type="number" min="0" class="score-input" />
                <button
                  class="primary btn-xs"
                  @click="saveResult(finalMatch._origRound, finalMatch._origMatch, finalMatch)"
                >
                  OK
                </button>
                <button class="btn-xs" @click="editingMatch = null">✕</button>
              </template>
              <template v-else>
                <button class="btn-xs" @click="startEdit(finalMatch)">
                  {{ finalMatch.result ? "Edit" : "Set score" }}
                </button>
                <button
                  class="btn-xs"
                  @click="emit('sim-match', finalMatch._origRound, finalMatch._origMatch)"
                >
                  🎲
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT SIDE: inner → outer -->
      <template v-for="(rightHalf, ri) in rightRounds" :key="'right-' + ri">
        <div :ref="(el) => setRightConnRef(el as Element | null, ri)" class="conn-col" />
        <div class="round-col">
          <div class="round-title">{{ rightRoundName(ri) }}</div>
          <div class="matches-col">
            <div
              v-for="(match, mi) in rightHalf"
              :key="match.id"
              :ref="(el) => setRightRef(el as Element | null, ri, mi)"
              class="match-card"
            >
              <div class="match-row" :class="{ winner: isWinner(match, match.homeId) }">
                <TeamBadge :team-id="match.homeId" :teams="teams" />
                <span v-if="match.result !== null" class="score">{{ match.result.home }}</span>
                <span v-else class="score tbd">-</span>
              </div>
              <div class="match-row" :class="{ winner: isWinner(match, match.awayId) }">
                <TeamBadge :team-id="match.awayId" :teams="teams" />
                <span v-if="match.result !== null" class="score">{{ match.result.away }}</span>
                <span v-else class="score tbd">-</span>
              </div>
              <div v-if="match.homeId && match.awayId" class="match-actions">
                <template v-if="editingMatch === match.id">
                  <input v-model.number="editHome" type="number" min="0" class="score-input" />
                  <span>–</span>
                  <input v-model.number="editAway" type="number" min="0" class="score-input" />
                  <button
                    class="primary btn-xs"
                    @click="saveResult(match._origRound, match._origMatch, match)"
                  >
                    OK
                  </button>
                  <button class="btn-xs" @click="editingMatch = null">✕</button>
                </template>
                <template v-else>
                  <button class="btn-xs" @click="startEdit(match)">
                    {{ match.result ? "Edit" : "Set score" }}
                  </button>
                  <button
                    class="btn-xs"
                    @click="emit('sim-match', match._origRound, match._origMatch)"
                  >
                    🎲
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.bracket-wrap {
  overflow-x: auto;
  padding-bottom: 8px;
}
.bracket {
  display: flex;
  align-items: stretch;
  min-height: 200px;
}
.round-col {
  display: flex;
  flex-direction: column;
  min-width: 172px;
  flex-shrink: 0;
}
.final-col {
  min-width: 180px;
}
.round-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  padding: 4px 8px 8px;
  text-align: center;
  flex-shrink: 0;
}
.matches-col {
  display: flex;
  flex-direction: column;
  flex: 1;
  justify-content: space-around;
  padding: 0 6px;
  gap: 6px;
}
.match-card {
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 12px;
  flex-shrink: 0;
}
.match-row {
  display: flex;
  align-items: center;
  padding: 4px 6px;
  border-bottom: 1px solid var(--border-light);
  gap: 4px;
}
.match-row:last-of-type {
  border-bottom: none;
}
.match-row.winner {
  background: color-mix(in srgb, var(--success) 12%, var(--surface));
  font-weight: 700;
}
.score {
  margin-left: auto;
  font-weight: 700;
  min-width: 14px;
  text-align: center;
}
.score.tbd {
  color: var(--text-muted);
  font-weight: normal;
}
.match-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 3px 6px;
  border-top: 1px solid var(--border-light);
  background: var(--bg);
}
.conn-col {
  width: 20px;
  flex-shrink: 0;
}
.score-input {
  width: 34px;
}
.btn-xs {
  font-size: 11px;
  padding: 1px 5px;
}
</style>
