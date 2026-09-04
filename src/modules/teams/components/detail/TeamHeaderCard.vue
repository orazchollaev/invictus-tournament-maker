<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { ArrowLeft } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { AppButton, AppCard, AppIcon, AppStarRating } from "@/components/ui"
import { FlagCircle } from "@/modules/teams/components"
import type { Team } from "@/modules/teams/types"

const props = defineProps<{ team: Team }>()
defineEmits<{ back: [] }>()

const { t } = useI18n()

const imgError = ref(false)
watch(
  () => props.team.image,
  () => {
    imgError.value = false
  }
)

// Cosmetic only — power (1-99) stays the source of truth for simulation.
const powerStars = computed(() => Math.round((props.team.power / 99) * 10) / 2)
</script>

<template>
  <AppCard padding="md" rail class="team-header-card">
    <div class="team-header">
      <AppButton variant="text" size="xs" @click="$emit('back')">
        <AppIcon :icon="ArrowLeft" />
        {{ t("common.back") }}
      </AppButton>

      <img
        v-if="team.image && !imgError"
        :src="team.image"
        class="team-image"
        alt=""
        @error="imgError = true"
      />
      <FlagCircle v-else-if="team.flag" :code="team.flag" :size="40" class="team-flag" />
      <span
        v-else
        class="team-dot"
        :style="{
          '--dot-color': team?.color ?? '#ccc',
          background: team.color,
        }"
      />

      <div>
        <h1 class="team-title">{{ team.name }}</h1>
        <span class="team-meta">
          {{ t("teams.detail.powerRating") }}:
          <strong>{{ team.power }}</strong>
          <AppStarRating :value="powerStars" :size="13" class="team-stars" />
        </span>
      </div>
    </div>
  </AppCard>
</template>

<style scoped>
/* --rail-color is set by the page from the team colour. */
.team-header-card {
  background: color-mix(in srgb, var(--rail-color, transparent) 5%, var(--surface));
}

.team-header {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.team-flag,
.team-dot,
.team-image {
  flex-shrink: 0;
}

.team-dot {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border-width: 4px;
  border-style: solid;
  border-color: color-mix(in srgb, var(--dot-color) 65%, #000);
}

.team-image {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: contain;
  display: block;
}

.team-title {
  margin: 0;
  font-family: var(--font);
  font-size: var(--fs-xl);
  font-weight: 400;
  line-height: 1.2;
}

.team-meta {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.team-stars {
  margin-inline-start: 2px;
}

@media (max-width: 600px) {
  .team-title {
    font-size: var(--fs-lg);
  }
}
</style>
