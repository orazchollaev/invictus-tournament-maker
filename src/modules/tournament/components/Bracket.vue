<script setup lang="ts">
import { ref, nextTick, watch, onMounted, onUnmounted } from "vue"
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

function saveResult(ri: number, mi: number, _match: Match) {
  if (editHome.value === editAway.value) return
  emit("set-result", ri, mi, editHome.value, editAway.value)
  editingMatch.value = null
}

function isWinner(match: Match, teamId: string | null) {
  if (!match.result || !teamId) return false
  return getWinnerId(match) === teamId
}

// --- Connector refs ---
const matchRefs: Record<number, Record<number, HTMLElement>> = {}
const connRefs: Record<number, HTMLElement> = {}

function setMatchRef(el: Element | null, ri: number, mi: number) {
  if (!el) return
  if (!matchRefs[ri]) matchRefs[ri] = {}
  matchRefs[ri][mi] = el as HTMLElement
}

function setConnRef(el: Element | null, ri: number) {
  if (el) connRefs[ri] = el as HTMLElement
}

function midY(el: HTMLElement, ref: DOMRect): number {
  const r = el.getBoundingClientRect()
  return (r.top + r.bottom) / 2 - ref.top
}

function drawConnectors() {
  props.tournament.rounds.forEach((round, ri) => {
    if (ri === 0) return
    const connEl = connRefs[ri]
    if (!connEl) return
    const connRect = connEl.getBoundingClientRect()
    const w = connRect.width
    const mid = w / 2
    const paths: string[] = []

    round.matches.forEach((_, ci) => {
      const srcA = matchRefs[ri - 1]?.[ci * 2]
      const srcB = matchRefs[ri - 1]?.[ci * 2 + 1]
      const dst = matchRefs[ri]?.[ci]
      if (!srcA || !srcB || !dst) return
      const ay = midY(srcA, connRect)
      const by = midY(srcB, connRect)
      const dy = midY(dst, connRect)
      paths.push(`M0 ${ay} H${mid} V${by} H0`)
      paths.push(`M${mid} ${dy} H${w}`)
    })

    connEl.innerHTML = `<svg width="100%" height="100%" style="display:block;overflow:visible">
      ${paths.map((d) => `<path d="${d}" fill="none" stroke="var(--border)" stroke-width="1"/>`).join("")}
    </svg>`
  })
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
      <template v-for="(round, ri) in tournament.rounds" :key="ri">
        <div v-if="ri > 0" :ref="(el) => setConnRef(el as Element | null, ri)" class="conn-col" />
        <div class="round-col">
          <div class="round-title">
            {{ round.name }}
          </div>
          <div class="matches-col">
            <div
              v-for="(match, mi) in round.matches"
              :key="match.id"
              :ref="(el) => setMatchRef(el as Element | null, ri, mi)"
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
                  <input v-model.number="editHome" type="number" min="0" style="width: 34px" />
                  <span>–</span>
                  <input v-model.number="editAway" type="number" min="0" style="width: 34px" />
                  <button
                    class="primary"
                    style="font-size: 11px; padding: 1px 5px"
                    @click="saveResult(ri, mi, match)"
                  >
                    OK
                  </button>
                  <button style="font-size: 11px; padding: 1px 4px" @click="editingMatch = null">
                    ✕
                  </button>
                </template>
                <template v-else>
                  <button style="font-size: 11px; padding: 1px 5px" @click="startEdit(match)">
                    {{ match.result ? "Edit" : "Set score" }}
                  </button>
                  <button
                    style="font-size: 11px; padding: 1px 5px"
                    @click="emit('sim-match', ri, mi)"
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
  background: #f0f9f0;
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
</style>
