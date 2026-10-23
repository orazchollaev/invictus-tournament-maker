<script setup lang="ts">
/**
 * Minute-by-minute editor for one match: who scored and when, who was carded,
 * who came on, who took which penalty. The scoreline is never typed here — it
 * is counted from the goals, so the report and the table cannot disagree.
 *
 * Nothing is written from this panel. "Apply" hands back a `WatchedMatch`,
 * exactly what the live window hands back, and the score modal puts it in its
 * fields and stash; the result is committed by that modal's own Save.
 */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { Goal, ListOrdered, Repeat } from "@lucide/vue"
import { AppButton, AppField, AppModal, AppSubTabBar, AppToggle } from "@/components/ui"
import { useModal } from "@/composables/useModal"
import {
  draftFromStats,
  rebuildStats,
  redsOfDraft,
  scoreOfEvents,
  shootoutTally,
  type MatchDraft,
  type WatchedMatch,
} from "@/engine"
import { MAX_GOALS } from "@/constants"
import { usePlayersStore } from "@/modules/players/store"
import { TeamBadge } from "@/modules/teams/components"
import type { Team } from "@/modules/teams/types"
import type { MatchStats } from "@/modules/tournament/types"
import MatchEventEditorEvents from "./MatchEventEditorEvents.vue"
import MatchEventEditorShootout from "./MatchEventEditorShootout.vue"
import MatchEventEditorSubs from "./MatchEventEditorSubs.vue"

type EditorTab = "events" | "subs" | "shootout"

const props = withDefaults(
  defineProps<{
    homeTeam: Team | null | undefined
    awayTeam: Team | null | undefined
    /** The report to start from — the saved one, or a generated/blank canvas. */
    base: MatchStats
    /** Whether the saved result went to extra time. */
    extraTime?: boolean
    /** Knockout tie: a winner is required, so extra time and a shootout are possible. */
    requiresWinner?: boolean
    /** Leg 2: the other leg's score in this fixture's home/away frame. */
    aggregateOffset?: { home: number; away: number } | null
    subtitle?: string
  }>(),
  { extraTime: false, requiresWinner: false, aggregateOffset: null }
)

const emit = defineEmits<{ close: []; apply: [watched: WatchedMatch] }>()

const { t } = useI18n()
const playersStore = usePlayersStore()
const modal = ref<InstanceType<typeof AppModal> | null>(null)
useModal(() => modal.value?.close())

const draft = ref<MatchDraft>(draftFromStats(props.base, props.requiresWinner && props.extraTime))

const homeSquad = computed(() => (props.homeTeam ? playersStore.byTeam(props.homeTeam.id) : []))
const awaySquad = computed(() => (props.awayTeam ? playersStore.byTeam(props.awayTeam.id) : []))

const score = computed(() => scoreOfEvents(draft.value.events, draft.value.extraTime))
const tally = computed(() => shootoutTally(draft.value.shootout))

const isLevel = (h: number, a: number) =>
  h + (props.aggregateOffset?.home ?? 0) === a + (props.aggregateOffset?.away ?? 0)

/** A level knockout tie (on aggregate, for leg 2) must be settled from the spot. */
const needsShootout = computed(
  () => props.requiresWinner && isLevel(score.value.home, score.value.away)
)

const issues = computed(() => {
  const list: string[] = []
  if (score.value.home > MAX_GOALS || score.value.away > MAX_GOALS) {
    list.push(t("matchEditor.tooManyGoals", { max: MAX_GOALS }))
  }
  const ft = score.value.ft
  if (draft.value.extraTime && ft && !isLevel(ft.home, ft.away)) {
    list.push(t("matchEditor.extraTimeNotNeeded"))
  }
  if (needsShootout.value) {
    if (!draft.value.shootout.length) list.push(t("matchEditor.shootoutRequired"))
    else if (tally.value.home === tally.value.away) list.push(t("matchEditor.shootoutTied"))
  }
  return list
})

const tabs = computed(() => {
  const list = [
    { value: "events", label: t("matchEditor.eventsTab"), icon: ListOrdered },
    { value: "subs", label: t("matchEditor.subsTab"), icon: Repeat },
  ]
  if (needsShootout.value) {
    list.push({ value: "shootout", label: t("matchStats.shootoutShort"), icon: Goal })
  }
  return list
})

const activeTab = ref<EditorTab>("events")
// The shootout tab disappears the moment the score stops being level.
const tab = computed<EditorTab>(() =>
  activeTab.value === "shootout" && !needsShootout.value ? "events" : activeTab.value
)

/** Switching extra time off folds anything past the stoppage window back into it. */
function setExtraTime(on: boolean) {
  const cap = on ? 120 : 95
  draft.value = {
    ...draft.value,
    extraTime: on,
    events: draft.value.events.map((e) => ({ ...e, minute: Math.min(e.minute, cap) })),
    substitutions: draft.value.substitutions.map((s) => ({
      ...s,
      minute: Math.min(s.minute, cap),
    })),
  }
}

function apply() {
  if (issues.value.length) return
  const shootout = needsShootout.value ? draft.value.shootout : []
  const stats = rebuildStats(props.base, { ...draft.value, shootout }, (id) => {
    return playersStore.byId(id)?.position
  })
  const { home, away, ft } = score.value
  emit("apply", {
    home,
    away,
    ...(needsShootout.value ? { penHome: tally.value.home, penAway: tally.value.away } : {}),
    ...(draft.value.extraTime && ft ? { ft } : {}),
    reds: redsOfDraft(draft.value),
    stats,
  })
  modal.value?.close()
}
</script>

<template>
  <AppModal
    ref="modal"
    :title="t('matchEditor.title')"
    width="min(640px, 100vw)"
    :z-index="1030"
    :dismiss-on-outside-click="false"
    @close="emit('close')"
  >
    <div class="editor">
      <header class="score">
        <TeamBadge :team="homeTeam" :size="22" class="score-team" />
        <div class="score-mid">
          <p class="score-line">
            <span>{{ score.home }}</span>
            <span class="score-dash">–</span>
            <span>{{ score.away }}</span>
          </p>
          <p v-if="draft.extraTime && score.ft" class="score-sub">
            {{ t("matchStats.aetFull", { home: score.ft.home, away: score.ft.away }) }}
          </p>
          <p v-if="needsShootout && draft.shootout.length" class="score-sub">
            {{ t("matchStats.shootout", { home: tally.home, away: tally.away }) }}
          </p>
          <p v-if="subtitle" class="score-sub">{{ subtitle }}</p>
        </div>
        <TeamBadge :team="awayTeam" :size="22" reverse class="score-team" />
      </header>

      <AppField
        v-if="requiresWinner"
        layout="split"
        :label="t('matchEditor.extraTime')"
        :description="t('matchEditor.extraTimeHint')"
      >
        <AppToggle
          :model-value="draft.extraTime"
          :aria-label="t('matchEditor.extraTime')"
          @update:model-value="setExtraTime"
        />
      </AppField>

      <AppSubTabBar
        :options="tabs"
        :model-value="tab"
        @update:model-value="(v) => (activeTab = v as EditorTab)"
      />

      <MatchEventEditorEvents
        v-if="tab === 'events'"
        v-model="draft.events"
        :home-team="homeTeam"
        :away-team="awayTeam"
        :home-squad="homeSquad"
        :away-squad="awaySquad"
        :extra-time="draft.extraTime"
      />
      <MatchEventEditorSubs
        v-else-if="tab === 'subs'"
        v-model="draft.substitutions"
        :home-team="homeTeam"
        :away-team="awayTeam"
        :home-squad="homeSquad"
        :away-squad="awaySquad"
        :extra-time="draft.extraTime"
      />
      <MatchEventEditorShootout
        v-else
        v-model="draft.shootout"
        :home-team="homeTeam"
        :away-team="awayTeam"
        :home-squad="homeSquad"
        :away-squad="awaySquad"
      />

      <ul v-if="issues.length" class="issues">
        <li v-for="issue in issues" :key="issue">{{ issue }}</li>
      </ul>
    </div>

    <template #footer>
      <div class="footer">
        <AppButton @click="modal?.close()">{{ t("common.cancel") }}</AppButton>
        <AppButton variant="filled" :disabled="issues.length > 0" @click="apply">
          {{ t("matchEditor.apply") }}
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-3);
}
.score {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: var(--sp-3);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--bg);
}
.score-team {
  flex: 1;
  min-width: 0;
}
.score-mid {
  text-align: center;
}
.score-line {
  margin: 0;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: var(--sp-2);
  font-family: var(--font-ui);
  font-size: var(--fs-xl);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.score-dash {
  color: var(--text-muted);
}
.score-sub {
  margin: 2px 0 0;
  font-size: var(--fs-xs);
  color: var(--text-muted);
}
.issues {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  font-size: var(--fs-sm);
  color: var(--danger);
}
.footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3) calc(var(--sp-2) + var(--safe-bottom));
}
</style>
