<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from "vue"
import type { Team, TeamLike } from "../types"
import { teamAbbr } from "@/composables/useTeamLookup"
import { useSettingsStore } from "@/modules/settings/store"

const settings = useSettingsStore()

const props = defineProps<{ team: Team | TeamLike | undefined | null; fallback?: string }>()

const el = ref<HTMLSpanElement>()
const showAbbr = ref(false)

async function check() {
  if (!el.value) return
  showAbbr.value = false
  await nextTick()
  if (!el.value) return
  showAbbr.value = el.value.scrollWidth > el.value.clientWidth
}

let ro: ResizeObserver | null = null

onMounted(() => {
  check()
  const target = el.value?.parentElement
  if (target) {
    ro = new ResizeObserver(check)
    ro.observe(target)
  }
})

onBeforeUnmount(() => ro?.disconnect())

watch(() => props.team, check)

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
