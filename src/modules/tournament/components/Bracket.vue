<script setup lang="ts">
import { ref, computed } from "vue"
import type { Tournament, Match } from "../types"
import type { Team } from "@/modules/teams/types"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import { getWinnerId } from "@/engine"
import { X, Shuffle } from "lucide-vue-next"

// ─── Props & Emits ────────────────────────────────────────────
const props = defineProps<{ tournament: Tournament; teams: Team[] }>()
const emit = defineEmits<{
  "set-result": [
    round: number,
    match: number,
    home: number,
    away: number,
    penHome?: number,
    penAway?: number,
  ]
  "sim-match": [round: number, match: number]
  "set-third-place-result": [home: number, away: number, penHome?: number, penAway?: number]
  "sim-third-place": []
}>()

// ─── Edit state ───────────────────────────────────────────────
const editingMatch = ref<string | null>(null)
const editMode = ref<"score" | "penalty">("score")
const editHome = ref(0)
const editAway = ref(0)
const editPenHome = ref(0)
const editPenAway = ref(0)

function startEdit(match: Match & { _origRound: number; _origMatch: number }) {
  editingMatch.value = match.id
  editMode.value = "score"
  editHome.value = match.result?.home ?? 0
  editAway.value = match.result?.away ?? 0
  editPenHome.value = match.result?.penHome ?? 0
  editPenAway.value = match.result?.penAway ?? 0
}
function cancelEdit() {
  editingMatch.value = null
  editMode.value = "score"
}
function saveResult(origRound: number, origMatch: number, match: any) {
  if (editHome.value === editAway.value) {
    editMode.value = "penalty"
    editPenHome.value = match.result?.penHome ?? 0
    editPenAway.value = match.result?.penAway ?? 0
    return
  }
  emit("set-result", origRound, origMatch, editHome.value, editAway.value)
  cancelEdit()
}
function savePenalties(origRound: number, origMatch: number) {
  if (editPenHome.value === editPenAway.value) return
  emit(
    "set-result",
    origRound,
    origMatch,
    editHome.value,
    editAway.value,
    editPenHome.value,
    editPenAway.value
  )
  cancelEdit()
}

// ─── 3. yer edit state ────────────────────────────────────────
const editingTp = ref(false)
const tpEditMode = ref<"score" | "penalty">("score")
const tpHome = ref(0)
const tpAway = ref(0)
const tpPenHome = ref(0)
const tpPenAway = ref(0)
const thirdPlaceMatch = computed(() => props.tournament.thirdPlaceMatch ?? null)

function startTpEdit() {
  const m = thirdPlaceMatch.value
  if (!m) return
  editingTp.value = true
  tpEditMode.value = "score"
  tpHome.value = m.result?.home ?? 0
  tpAway.value = m.result?.away ?? 0
  tpPenHome.value = m.result?.penHome ?? 0
  tpPenAway.value = m.result?.penAway ?? 0
}
function cancelTpEdit() {
  editingTp.value = false
  tpEditMode.value = "score"
}
function saveTpResult() {
  if (tpHome.value === tpAway.value) {
    tpEditMode.value = "penalty"
    return
  }
  emit("set-third-place-result", tpHome.value, tpAway.value)
  cancelTpEdit()
}
function saveTpPenalties() {
  if (tpPenHome.value === tpPenAway.value) return
  emit("set-third-place-result", tpHome.value, tpAway.value, tpPenHome.value, tpPenAway.value)
  cancelTpEdit()
}

// ─── Yardımcı ─────────────────────────────────────────────────
function isWinner(match: Match, teamId: string | null) {
  if (!match.result || !teamId) return false
  return getWinnerId(match) === teamId
}

// ─── Bracket yapısı ───────────────────────────────────────────
interface DisplayMatch extends Match {
  _origRound: number
  _origMatch: number
}

const allRounds = computed(() => props.tournament.rounds)

const displayRounds = computed((): DisplayMatch[][] =>
  allRounds.value.map((r, ri) =>
    r.matches.map((m, mi) => ({ ...m, _origRound: ri, _origMatch: mi }))
  )
)

// ─── Layout hesabı ────────────────────────────────────────────
// İlk round'daki maç sayısına göre bracket yüksekliğini belirle.
// Her maç kartı sabit yükseklikte. Round i'deki maç j'nin Y merkezi:
//   slot = toplam slot / maç sayısı  (her maç kaç slot kaplar)
//   Y_center(i, j) = (j + 0.5) * slot * CARD_H

const CARD_H = 90 // match-card yaklaşık yüksekliği px (border + 2 satır + actions)
const CARD_GAP = 20 // ilk round maçlar arası minimum boşluk
const CARD_W = 172
const COL_GAP = 32 // connector genişliği
const HEADER_H = 28 // round-title yüksekliği

const totalBracketH = computed(() => {
  const firstCount = displayRounds.value[0]?.length ?? 1
  // Her maç için CARD_H + GAP, son maçta gap yok
  return firstCount * CARD_H + (firstCount - 1) * CARD_GAP
})

// Round i'deki maç j'nin Y merkezi (bracket alanı içinde, header hariç)
function matchCenterY(roundIndex: number, matchIndex: number): number {
  const firstCount = displayRounds.value[0]?.length ?? 1
  const matchCount = displayRounds.value[roundIndex]?.length ?? 1
  const totalH = firstCount * CARD_H + (firstCount - 1) * CARD_GAP
  const slotSize = totalH / matchCount
  return slotSize * matchIndex + slotSize / 2
}

// Kart top pozisyonu (merkez - yarı yükseklik)
function cardTop(roundIndex: number, matchIndex: number): number {
  return matchCenterY(roundIndex, matchIndex) - CARD_H / 2
}

// ─── SVG connector çizimi ─────────────────────────────────────
interface ConnPath {
  ay: number
  by: number
  dy: number
}

function connectorPaths(roundIndex: number): ConnPath[] {
  const nextCount = displayRounds.value[roundIndex + 1]?.length ?? 0
  const paths: ConnPath[] = []
  for (let ci = 0; ci < nextCount; ci++) {
    const ay = matchCenterY(roundIndex, ci * 2)
    const by = matchCenterY(roundIndex, ci * 2 + 1)
    const dy = matchCenterY(roundIndex + 1, ci)
    paths.push({ ay, by, dy })
  }
  return paths
}

function svgPath(p: ConnPath, w: number): string {
  const mid = w / 2
  return [
    `M0,${p.ay} H${mid}`,
    `M0,${p.by} H${mid}`,
    `M${mid},${p.ay} V${p.by}`,
    `M${mid},${(p.ay + p.by) / 2} H${w}`,
  ].join(" ")
}
</script>

<template>
  <div class="bracket-wrap">
    <div class="bracket" :style="{ height: totalBracketH + HEADER_H + 'px' }">
      <template v-for="(roundMatches, ri) in displayRounds" :key="'round-' + ri">
        <!-- Round kolonu -->
        <div class="round-col" :style="{ width: CARD_W + 'px' }">
          <div class="round-title" :class="{ 'final-title': ri === displayRounds.length - 1 }">
            {{ allRounds[ri].name }}
          </div>
          <!-- Absolute-positioned maç kartları -->
          <div class="matches-area" :style="{ height: totalBracketH + 'px' }">
            <div
              v-for="(match, mi) in roundMatches"
              :key="match.id"
              class="match-card"
              :class="{ final: ri === displayRounds.length - 1 }"
              :style="{
                position: 'absolute',
                top: cardTop(ri, mi) + 'px',
                left: 0,
                right: 0,
              }"
            >
              <!-- Home -->
              <div
                class="match-row"
                :class="{
                  winner: isWinner(match, match.homeId),
                  loser: match.result && !isWinner(match, match.homeId),
                }"
              >
                <TeamBadge :team-id="match.homeId" :teams="teams" />
                <span v-if="match.result" class="score">
                  {{ match.result.home }}
                  <span v-if="match.result.penHome !== undefined" class="pen-badge">
                    [{{ match.result.penHome }}]
                  </span>
                </span>
                <span v-else class="score tbd">-</span>
              </div>
              <!-- Away -->
              <div
                class="match-row"
                :class="{
                  winner: isWinner(match, match.awayId),
                  loser: match.result && !isWinner(match, match.awayId),
                }"
              >
                <TeamBadge :team-id="match.awayId" :teams="teams" />
                <span v-if="match.result" class="score">
                  {{ match.result.away }}
                  <span v-if="match.result.penAway !== undefined" class="pen-badge">
                    [{{ match.result.penAway }}]
                  </span>
                </span>
                <span v-else class="score tbd">-</span>
              </div>
              <!-- Aksiyonlar -->
              <div v-if="match.homeId && match.awayId" class="match-actions">
                <template v-if="editingMatch === match.id && editMode === 'penalty'">
                  <span class="pen-label">Pen.</span>
                  <input v-model.number="editPenHome" type="number" min="0" class="score-input" />
                  <span>–</span>
                  <input v-model.number="editPenAway" type="number" min="0" class="score-input" />
                  <button
                    class="primary btn-xs"
                    :disabled="editPenHome === editPenAway"
                    @click="savePenalties(match._origRound, match._origMatch)"
                  >
                    OK
                  </button>
                  <button class="btn-xs" @click="cancelEdit"><X :size="13" /></button>
                </template>
                <template v-else-if="editingMatch === match.id">
                  <input v-model.number="editHome" type="number" min="0" class="score-input" />
                  <span>–</span>
                  <input v-model.number="editAway" type="number" min="0" class="score-input" />
                  <button
                    class="primary btn-xs"
                    @click="saveResult(match._origRound, match._origMatch, match)"
                  >
                    OK
                  </button>
                  <button class="btn-xs" @click="cancelEdit"><X :size="13" /></button>
                </template>
                <template v-else>
                  <button class="btn-xs" @click="startEdit(match)">
                    {{ match.result ? "Edit" : "Set score" }}
                  </button>
                  <button
                    class="btn-xs"
                    @click="emit('sim-match', match._origRound, match._origMatch)"
                  >
                    <Shuffle :size="13" />
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- Connector (son round'dan sonra yok) -->
        <div
          v-if="ri < displayRounds.length - 1"
          class="conn-col"
          :style="{
            width: COL_GAP + 'px',
            marginTop: HEADER_H + 'px',
            height: totalBracketH + 'px',
          }"
        >
          <svg width="100%" height="100%" style="display: block; overflow: visible">
            <path
              v-for="(p, pi) in connectorPaths(ri)"
              :key="pi"
              :d="svgPath(p, COL_GAP)"
              fill="none"
              stroke="var(--border-light)"
              stroke-width="1.5"
            />
          </svg>
        </div>
      </template>

      <!-- ── 3. yer maçı ── -->
      <template v-if="tournament.hasThirdPlace && thirdPlaceMatch">
        <div
          class="tp-divider"
          :style="{ marginTop: HEADER_H + 'px', height: totalBracketH + 'px' }"
        />
        <div class="round-col" :style="{ width: CARD_W + 'px' }">
          <div class="round-title tp-title">3rd Place</div>
          <div class="matches-area" :style="{ height: totalBracketH + 'px' }">
            <div
              class="match-card tp-card"
              :style="{
                position: 'absolute',
                top: totalBracketH / 2 - CARD_H / 2 + 'px',
                left: 0,
                right: 0,
              }"
            >
              <template v-if="!thirdPlaceMatch.homeId || !thirdPlaceMatch.awayId">
                <div class="tp-waiting">Waiting for semi-finals…</div>
              </template>
              <template v-else>
                <div
                  class="match-row"
                  :class="{
                    winner: isWinner(thirdPlaceMatch, thirdPlaceMatch.homeId),
                    loser:
                      thirdPlaceMatch.result && !isWinner(thirdPlaceMatch, thirdPlaceMatch.homeId),
                  }"
                >
                  <TeamBadge :team-id="thirdPlaceMatch.homeId" :teams="teams" />
                  <span v-if="thirdPlaceMatch.result" class="score">
                    {{ thirdPlaceMatch.result.home }}
                    <span v-if="thirdPlaceMatch.result.penHome !== undefined" class="pen-badge">
                      [{{ thirdPlaceMatch.result.penHome }}]
                    </span>
                  </span>
                  <span v-else class="score tbd">-</span>
                </div>
                <div
                  class="match-row"
                  :class="{
                    winner: isWinner(thirdPlaceMatch, thirdPlaceMatch.awayId),
                    loser:
                      thirdPlaceMatch.result && !isWinner(thirdPlaceMatch, thirdPlaceMatch.awayId),
                  }"
                >
                  <TeamBadge :team-id="thirdPlaceMatch.awayId" :teams="teams" />
                  <span v-if="thirdPlaceMatch.result" class="score">
                    {{ thirdPlaceMatch.result.away }}
                    <span v-if="thirdPlaceMatch.result.penAway !== undefined" class="pen-badge">
                      [{{ thirdPlaceMatch.result.penAway }}]
                    </span>
                  </span>
                  <span v-else class="score tbd">-</span>
                </div>
                <div class="match-actions">
                  <template v-if="editingTp && tpEditMode === 'penalty'">
                    <span class="pen-label">Pen.</span>
                    <input v-model.number="tpPenHome" type="number" min="0" class="score-input" />
                    <span>–</span>
                    <input v-model.number="tpPenAway" type="number" min="0" class="score-input" />
                    <button
                      class="primary btn-xs"
                      :disabled="tpPenHome === tpPenAway"
                      @click="saveTpPenalties"
                    >
                      OK
                    </button>
                    <button class="btn-xs" @click="cancelTpEdit"><X :size="13" /></button>
                  </template>
                  <template v-else-if="editingTp">
                    <input v-model.number="tpHome" type="number" min="0" class="score-input" />
                    <span>–</span>
                    <input v-model.number="tpAway" type="number" min="0" class="score-input" />
                    <button class="primary btn-xs" @click="saveTpResult">OK</button>
                    <button class="btn-xs" @click="cancelTpEdit"><X :size="13" /></button>
                  </template>
                  <template v-else>
                    <button class="btn-xs" @click="startTpEdit">
                      {{ thirdPlaceMatch.result ? "Edit" : "Set score" }}
                    </button>
                    <button
                      v-if="!thirdPlaceMatch.result"
                      class="btn-xs"
                      @click="emit('sim-third-place')"
                    >
                      <Shuffle :size="13" />
                    </button>
                  </template>
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.bracket-wrap {
  width: fit-content;
  max-width: 100%;
  overflow-x: auto;
  padding-bottom: 8px;
}

.bracket {
  display: flex;
  align-items: flex-start;
  position: relative;
}

/* ── Round kolonu ── */
.round-col {
  display: flex;
  flex-direction: column;
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
  height: 28px;
  box-sizing: border-box;
}

/* Maçların absolute içinde yer aldığı kap */
.matches-area {
  position: relative;
  width: 100%;
}

/* ── Connector kolonu ── */
.conn-col {
  flex-shrink: 0;
}

/* ── Maç kartı ── */
.match-card {
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--surface);
  font-size: 12px;
  overflow: hidden;
  box-sizing: border-box;
}

/* ── Takım satırı ── */
.match-row {
  display: flex;
  align-items: center;
  padding: 5px 8px;
  border-bottom: 1px solid var(--border-light);
  gap: 6px;
  min-height: 28px;
  transition: background 0.1s;
}
.match-row:last-of-type {
  border-bottom: none;
}
.match-row.winner {
  background: color-mix(in srgb, var(--success) 10%, var(--surface));
  font-weight: 700;
}
.match-row.loser {
  opacity: 0.55;
}

/* ── Skor ── */
.score {
  margin-left: auto;
  font-weight: 700;
  min-width: 20px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
  background: color-mix(in srgb, var(--text-muted) 10%, var(--surface));
  border-radius: 3px;
  padding: 1px 5px;
}
.score.tbd {
  color: var(--text-muted);
  font-weight: 400;
  background: transparent;
}
.pen-badge {
  font-size: 10px;
  font-weight: 400;
  color: var(--text-muted);
}

/* ── Aksiyon satırı ── */
.match-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  padding: 4px 6px;
  border-top: 1px solid var(--border-light);
  background: var(--bg);
}

/* ── Skor input ── */
.score-input {
  width: 32px;
  text-align: center;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 2px 4px;
  font-size: 12px;
  font-weight: 700;
  color: inherit;
  font-family: var(--font-ui);
  -moz-appearance: textfield;
  appearance: textfield;
}
.score-input:focus {
  outline: none;
  border-color: var(--accent);
}
.score-input::-webkit-outer-spin-button,
.score-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.pen-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

/* ── Final kartı: altın tema ── */
.match-card.final {
  border-color: #c9a227;
  box-shadow:
    0 0 0 1px #c9a22733,
    0 2px 12px #c9a22722;
}
.match-card.final .match-row {
  border-bottom-color: #c9a22733;
}
.match-card.final .match-row.winner {
  background: color-mix(in srgb, #c9a227 14%, var(--surface));
}
.match-card.final .score {
  background: color-mix(in srgb, #c9a227 18%, var(--surface));
  color: #b8860b;
}
.final-title {
  color: #c9a227 !important;
}

.match-card.final .match-actions {
  border-top-color: #c9a22733;
  background: color-mix(in srgb, #c9a227 6%, var(--bg));
}

/* ── 3. yer ── */
.tp-divider {
  width: 1px;
  background: var(--border-light);
  flex-shrink: 0;
  margin-left: 16px;
  margin-right: 16px;
  opacity: 0.5;
}
.tp-title {
  color: var(--accent-2);
}
.tp-card {
  border-color: color-mix(in srgb, var(--accent-2) 35%, var(--border-light));
}
.tp-waiting {
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
  padding: 10px 8px;
}
</style>
