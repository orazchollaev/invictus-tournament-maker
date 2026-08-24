<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import type { Team } from "@/modules/teams/types"
import type { CeremonyKind, DrawStep } from "@/engine"
import type { CeremonySpeed } from "../../composables/useDrawCeremony"
import { useTeamLookup } from "@/composables/useTeamLookup"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"

const props = defineProps<{
  revealed: DrawStep[]
  current: DrawStep | null
  sequence: DrawStep[]
  teams: Team[]
  speed: CeremonySpeed
  kind: CeremonyKind
}>()

const { t } = useI18n()
const { teamById } = useTeamLookup(() => props.teams)

const leaveMs = computed(() => (props.speed === "fast" ? 90 : 240))

// Pot index → a fixed accent from the theme's existing multi-hue tokens, so a
// team's origin pot stays visible on the board without inventing new colors.
const POT_PALETTE = [
  "var(--accent)",
  "var(--accent-2)",
  "var(--pos-2)",
  "var(--pos-3)",
  "var(--gold-text)",
]
function potColor(idx: number) {
  return POT_PALETTE[idx % POT_PALETTE.length]
}

// Group/bracket board: one entry per distinct targetLabel ("Group A",
// "Match 3", "BYE 1", …), holding every step that lands there in draw order.
const slots = computed(() => {
  const order: string[] = []
  const map = new Map<string, DrawStep[]>()
  for (const step of props.sequence) {
    if (!map.has(step.targetLabel)) {
      map.set(step.targetLabel, [])
      order.push(step.targetLabel)
    }
    map.get(step.targetLabel)!.push(step)
  }
  return order.map((label) => ({ label, steps: map.get(label)! }))
})

// Swiss board: one panel per team holding the opponents it drew. Grouping by
// targetLabel would collapse the whole field into a single panel, since every
// Swiss step shares the same label.
const swissSlots = computed(() =>
  props.sequence.map((step) => ({
    step,
    team: teamById(step.teamId),
    opponentIds: step.opponentIds ?? [],
  }))
)

const revealedIds = computed(() => new Set(props.revealed.map((r) => r.teamId)))
function isRevealed(step: DrawStep) {
  return revealedIds.value.has(step.teamId)
}

function isBye(label: string) {
  return label.startsWith("BYE")
}
</script>

<template>
  <div class="ds-wrap">
    <div class="ds-stage">
      <Transition name="ds-capsule" appear :duration="{ enter: 760, leave: leaveMs }">
        <div
          v-if="current"
          :key="current.teamId"
          class="ds-capsule"
          :style="{ '--ds-leave-dur': `${leaveMs}ms` }"
        >
          <div class="ds-paper">
            <TeamBadge :team="teamById(current.teamId)" :size="24" class="ds-paper-face" />
          </div>
          <div v-if="kind === 'swiss'" class="ds-opponents">
            <TeamBadge
              v-for="oid in current.opponentIds ?? []"
              :key="oid"
              :team="teamById(oid)"
              :size="11"
              class="ds-opponent"
            />
          </div>
          <div v-else class="ds-target">{{ current.targetLabel }}</div>
        </div>
      </Transition>
    </div>

    <!-- Swiss: team → drawn opponents -->
    <div v-if="kind === 'swiss'" class="ds-board ds-board--swiss">
      <div v-for="slot in swissSlots" :key="slot.step.teamId" class="ds-slot">
        <div class="ds-slot-label ds-slot-label--team">
          <TeamBadge :team="slot.team" :size="11" />
        </div>
        <div class="ds-slot-rows">
          <div v-for="(oid, i) in slot.opponentIds" :key="i" class="ds-row">
            <Transition name="ds-pop">
              <TeamBadge
                v-if="isRevealed(slot.step)"
                :team="teamById(oid)"
                :size="12"
                class="ds-slot-team"
              />
              <span v-else class="ds-row-empty" />
            </Transition>
          </div>
        </div>
      </div>
    </div>

    <!-- Group: one card per group, rows tinted by the team's pot -->
    <div v-else-if="kind === 'group'" class="ds-board ds-board--groups">
      <div v-for="slot in slots" :key="slot.label" class="ds-slot ds-group">
        <div class="ds-slot-label">{{ slot.label }}</div>
        <div class="ds-slot-rows">
          <div v-for="(step, i) in slot.steps" :key="i" class="ds-row ds-row--pot">
            <Transition name="ds-pop">
              <span v-if="isRevealed(step)" class="ds-pot-team">
                <span class="ds-pot-dot" :style="{ background: potColor(step.potIdx) }" />
                <TeamBadge :team="teamById(step.teamId)" :size="12" />
              </span>
              <span v-else class="ds-row-empty" />
            </Transition>
          </div>
        </div>
      </div>
    </div>

    <!-- Bracket / playoff: side-by-side match cards, byes as compact chips -->
    <div v-else class="ds-board ds-board--matches">
      <div
        v-for="slot in slots"
        :key="slot.label"
        class="ds-match"
        :class="{ 'ds-match--bye': isBye(slot.label) }"
      >
        <div class="ds-match-label">{{ isBye(slot.label) ? t("manualDraw.bye") : slot.label }}</div>

        <template v-if="isBye(slot.label)">
          <div class="ds-match-rows ds-match-rows--single">
            <Transition name="ds-pop">
              <TeamBadge
                v-if="isRevealed(slot.steps[0])"
                :team="teamById(slot.steps[0].teamId)"
                :size="13"
                class="ds-match-team"
              />
              <span v-else class="ds-row-empty" />
            </Transition>
          </div>
        </template>
        <template v-else>
          <div class="ds-match-rows">
            <div v-for="(step, i) in slot.steps" :key="i" class="ds-match-row">
              <Transition name="ds-pop">
                <TeamBadge
                  v-if="isRevealed(step)"
                  :team="teamById(step.teamId)"
                  :size="13"
                  class="ds-match-team"
                />
                <span v-else class="ds-row-empty" />
              </Transition>
            </div>
            <span class="ds-vs">{{ t("common.vs") }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ds-wrap {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Folded-paper stage ── */
.ds-stage {
  height: 104px;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 900px;
}
.ds-capsule {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transform-style: preserve-3d;
}
.ds-paper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 150px;
  padding: 12px 22px;
  transform-style: preserve-3d;
  /* Deliberately theme-independent: this is the physical draw slip, which is
     white card stock in light and dark alike. Not a surface — do not tokenise. */
  background: linear-gradient(to bottom, #ffffff 0%, #f3f4f8 49%, #e7e9f0 51%, #f6f7fa 100%);
  color: #1a2234;
  border: 1px solid #c2c7d4;
  border-radius: 3px;
  transform-origin: top center;
  overflow: hidden;
}
/* Center crease: flashes as the paper passes through the fold, then fades
   once it lies flat — the seam a real slip keeps after being unfolded. */
.ds-paper::before {
  content: "";
  position: absolute;
  left: 6%;
  right: 6%;
  top: 50%;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(20, 24, 40, 0.28), transparent);
  opacity: 0;
  pointer-events: none;
}
/* Faint diagonal grain so the slip reads as paper, not a flat chip. */
.ds-paper::after {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    115deg,
    transparent,
    transparent 3px,
    rgba(20, 24, 40, 0.025) 3px,
    rgba(20, 24, 40, 0.025) 4px
  );
  pointer-events: none;
}
.ds-paper-face {
  gap: 9px;
}
.ds-paper-face :deep(.name) {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.01em;
  white-space: nowrap;
}
.ds-opponents {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px 10px;
  max-width: 380px;
}
.ds-opponent {
  font-size: 11px;
  color: var(--text-muted);
}

.ds-slot-label--team {
  padding: 4px 8px;
  text-transform: none;
  letter-spacing: 0;
  color: var(--text);
}

.ds-target {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent);
}

/* The paper drops in folded (edge-on at the top crease), unfolds past flat
   with a small overshoot, then settles — the little wobble a real slip does
   when it lands open on a table instead of stopping dead. */
@keyframes ds-unfold {
  0% {
    opacity: 0;
    transform: translateY(-16px) rotateX(-88deg);
  }
  40% {
    opacity: 1;
    transform: translateY(0) rotateX(-88deg);
  }
  75% {
    transform: rotateX(12deg);
  }
  90% {
    transform: rotateX(-3deg);
  }
  100% {
    transform: rotateX(0deg);
  }
}
/* Contact shadow builds as the slip flattens toward the table — folded paper
   barely casts one, flat paper casts its full drop shadow. */
@keyframes ds-shadow-grow {
  0%,
  45% {
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.7);
  }
  100% {
    box-shadow:
      0 8px 22px rgba(0, 0, 0, 0.22),
      inset 0 1px 0 rgba(255, 255, 255, 0.7);
  }
}
@keyframes ds-crease-flash {
  0%,
  35% {
    opacity: 0;
  }
  55% {
    opacity: 1;
  }
  85% {
    opacity: 0.25;
  }
  100% {
    opacity: 0;
  }
}
/* Name + dot stay hidden until the paper is mostly open, then pop in. */
@keyframes ds-name-in {
  0%,
  55% {
    opacity: 0;
    transform: scale(0.8);
  }
  80% {
    opacity: 1;
    transform: scale(1.08);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
.ds-capsule-enter-active .ds-paper {
  animation:
    ds-unfold 0.66s cubic-bezier(0.34, 1.1, 0.64, 1) both,
    ds-shadow-grow 0.66s ease both;
}
.ds-capsule-enter-active .ds-paper::before {
  animation: ds-crease-flash 0.66s ease both;
}
.ds-capsule-enter-active .ds-paper-face {
  animation: ds-name-in 0.66s ease both;
}
.ds-capsule-leave-active .ds-paper {
  transition:
    opacity var(--ds-leave-dur, 0.24s) ease,
    transform var(--ds-leave-dur, 0.24s) ease;
}
.ds-capsule-leave-to .ds-paper {
  opacity: 0;
  transform: translateY(12px) scale(0.9);
}

/* ── Board (shared grid shell) ── */
.ds-board {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
  height: 46vh;
  overflow-y: auto;
  align-content: start;
}
.ds-slot {
  border: 1px solid var(--border-light);
  background: var(--bg);
  border-radius: var(--radius);
}
.ds-slot-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 5px 8px;
  border-bottom: 1px solid var(--border-light);
  border-left: 3px solid var(--accent);
}
.ds-slot-rows {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px;
}
.ds-row {
  position: relative;
  height: 20px;
}
.ds-row-empty {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 4px,
    color-mix(in srgb, var(--border-light) 55%, transparent) 4px,
    color-mix(in srgb, var(--border-light) 55%, transparent) 5px
  );
  opacity: 0.5;
}
.ds-slot-team {
  position: absolute;
  inset: 0;
  gap: 6px;
}

/* team drops into its (already-sized) slot — no layout shift */
.ds-pop-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.ds-pop-enter-from {
  opacity: 0;
  transform: translateY(-7px) scale(0.92);
}

/* ── Group cards: pot-colored dot per row ── */
.ds-group {
  border-left: 3px solid var(--accent);
}
.ds-group .ds-slot-label {
  border-left: none;
}
.ds-row--pot {
  height: 22px;
}
.ds-pot-team {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ds-pot-dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

/* ── Bracket match cards: two rows joined by a "vs" divider ── */
.ds-board--matches {
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
}
.ds-match {
  border: 1px solid var(--border-light);
  background: var(--bg);
  border-radius: var(--radius);
  overflow: hidden;
}
.ds-match-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 5px 8px;
  border-bottom: 1px solid var(--border-light);
}
.ds-match--bye .ds-match-label {
  color: var(--warning);
}
.ds-match-rows {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 4px 8px;
}
.ds-match-row {
  position: relative;
  height: 26px;
  border-bottom: 1px dashed var(--border-light);
}
.ds-match-row:last-child {
  border-bottom: none;
}
.ds-match-rows--single .ds-row-empty,
.ds-match-rows--single {
  height: 26px;
}
.ds-match-team {
  position: absolute;
  inset: 0;
  gap: 7px;
}
.ds-vs {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: 999px;
  padding: 1px 5px;
}

@media (max-width: 600px) {
  .ds-board {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    height: 65vh;
  }
  .ds-board--matches {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
}
</style>
