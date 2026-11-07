<script setup lang="ts">
/**
 * A team name that swaps to the team's abbreviation when the full name does
 * not fit its box (and the "show abbreviations" setting is on).
 *
 * Fitting means measuring, and this is in every bracket card and table row,
 * so the measuring is kept cheap: one shared ResizeObserver for all of them
 * (sized against the parent, which is what decides the room available), no
 * measuring at all while the setting is off, and the name is only un-shortened
 * to re-measure when it is currently shortened.
 */
import { ref, computed, watch, nextTick } from "vue"
import type { Team, TeamLike } from "../types"
import { teamAbbr } from "@/composables/useTeamLookup"
import { useSharedResizeObserver } from "@/composables/useSharedResizeObserver"
import { useSettingsStore } from "@/modules/settings/store"

const props = defineProps<{ team: Team | TeamLike | undefined | null; fallback?: string }>()

const settings = useSettingsStore()

const el = ref<HTMLSpanElement>()
const box = computed(() => el.value?.parentElement)
const showAbbr = ref(false)

async function check() {
  if (!el.value || !settings.showTeamAbbr) {
    showAbbr.value = false
    return
  }
  // Only a shortened name needs putting back to see whether the full one fits.
  if (showAbbr.value) {
    showAbbr.value = false
    await nextTick()
    if (!el.value) return
  }
  showAbbr.value = el.value.scrollWidth > el.value.clientWidth
}

useSharedResizeObserver(box, check, () => settings.showTeamAbbr)

watch(
  () => props.team?.name,
  () => {
    if (settings.showTeamAbbr) void check()
  }
)

const text = computed(() => {
  if (!props.team) return props.fallback ?? "TBD"
  return settings.showTeamAbbr && showAbbr.value ? teamAbbr(props.team) : props.team.name
})
</script>

<template>
  <span ref="el" class="tna" :title="team?.name">{{ text }}</span>
</template>

<style scoped>
.tna {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
</style>
