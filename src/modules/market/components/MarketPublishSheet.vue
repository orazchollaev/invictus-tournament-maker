<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { Check } from "@lucide/vue"
import { AppButton, AppButtonGroup, AppField, AppIcon, AppSheet, AppToggle } from "@/components/ui"
import { useTeamsStore } from "@/modules/teams/store"
import { TeamBadge } from "@/modules/teams/components"
import { isDrawnCrest } from "@/modules/teams/utils/imageUtils"
import { useMarketActions } from "../composables/useMarketActions"
import { MARKET_LIMITS } from "../constants"
import type { MarketDataset } from "../types"

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const teamsStore = useTeamsStore()
const actions = useMarketActions()
const sheet = ref<InstanceType<typeof AppSheet> | null>(null)

const label = ref("")
const description = ref("")
const type = ref<MarketDataset["type"]>("club")
const picked = ref(new Set<string>())
const withImages = ref(true)
const busy = ref(false)

// Only uploaded pictures are shrunk and shared; flags and builder crests already travel.
const imageCount = computed(
  () =>
    teamsStore.teams.filter(
      (x) => picked.value.has(x.id) && x.image && !x.crest && !isDrawnCrest(x.image)
    ).length
)

const typeOptions = computed(() => [
  { value: "club", label: t("market.type.club") },
  { value: "country", label: t("market.type.country") },
])

const allPicked = computed(
  () => teamsStore.teams.length > 0 && picked.value.size === teamsStore.teams.length
)
const tooMany = computed(() => picked.value.size > MARKET_LIMITS.maxTeams)
const canPublish = computed(
  () =>
    !busy.value &&
    label.value.trim().length > 0 &&
    description.value.trim().length > 0 &&
    picked.value.size > 0 &&
    !tooMany.value
)

function toggle(id: string) {
  const next = new Set(picked.value)
  if (!next.delete(id)) next.add(id)
  picked.value = next
}

function toggleAll() {
  picked.value = allPicked.value ? new Set() : new Set(teamsStore.teams.map((x) => x.id))
}

async function submit() {
  if (!canPublish.value) return
  busy.value = true
  try {
    const ok = await actions.publish(
      { label: label.value, description: description.value, type: type.value },
      [...picked.value],
      withImages.value
    )
    if (ok) sheet.value?.close()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AppSheet ref="sheet" :title="t('market.publishTitle')" @close="emit('close')">
    <div class="mps-body">
      <AppField :label="t('market.fieldName')" layout="stack">
        <input
          v-model="label"
          type="text"
          class="mps-input"
          :maxlength="MARKET_LIMITS.maxLabel"
          :placeholder="t('market.namePlaceholder')"
        />
      </AppField>

      <AppField :label="t('market.fieldDescription')" layout="stack">
        <textarea
          v-model="description"
          class="mps-input mps-textarea"
          rows="3"
          :maxlength="MARKET_LIMITS.maxDescription"
          :placeholder="t('market.descriptionPlaceholder')"
        />
        <span class="mps-counter">{{ description.length }}/{{ MARKET_LIMITS.maxDescription }}</span>
      </AppField>

      <AppField :label="t('market.fieldType')" layout="stack">
        <AppButtonGroup v-model="type" :options="typeOptions" block />
      </AppField>

      <section class="mps-teams-section">
        <div class="mps-teams-head">
          <span class="mps-teams-title">
            {{ t("market.fieldTeams", { n: picked.size, max: MARKET_LIMITS.maxTeams }) }}
          </span>
          <AppButton size="xs" variant="text" @click="toggleAll">
            {{ allPicked ? t("market.clearAll") : t("market.selectAll") }}
          </AppButton>
        </div>

        <p v-if="!teamsStore.teams.length" class="mps-hint">{{ t("market.noTeams") }}</p>
        <ul v-else class="mps-teams">
          <li v-for="team in teamsStore.teams" :key="team.id">
            <button
              type="button"
              class="mps-team"
              :class="{ 'mps-team--on': picked.has(team.id) }"
              :aria-pressed="picked.has(team.id)"
              @click="toggle(team.id)"
            >
              <span class="mps-check" aria-hidden="true">
                <AppIcon v-if="picked.has(team.id)" :icon="Check" size="xs" />
              </span>
              <TeamBadge :team="team" :size="20" class="mps-badge" />
            </button>
          </li>
        </ul>
      </section>

      <div v-if="imageCount" class="mps-images">
        <div class="mps-images-text">
          <span class="mps-teams-title">{{ t("market.includeImages") }}</span>
          <span class="mps-hint">{{ t("market.includeImagesHint", { n: imageCount }) }}</span>
        </div>
        <AppToggle v-model="withImages" :aria-label="t('market.includeImages')" />
      </div>

      <p class="mps-hint">{{ t("market.publishNotice") }}</p>
    </div>

    <template #footer>
      <div class="mps-footer">
        <AppButton variant="filled" block :disabled="!canPublish" @click="submit">
          {{ t("market.publish") }}
        </AppButton>
      </div>
    </template>
  </AppSheet>
</template>

<style scoped>
.mps-body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  min-width: 0;
  padding: var(--sp-4);
  overflow-y: auto;
}

.mps-input {
  display: block;
  width: 100%;
  box-sizing: border-box;
}

.mps-textarea {
  min-height: 84px;
  resize: vertical;
  font-family: var(--font-ui);
  font-size: var(--fs-sm);
  border: 1px solid var(--border);
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  transition:
    border-color var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease);
}

@media (max-width: 600px) {
  .mps-textarea {
    font-size: var(--fs-md);
  }
}

.mps-textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: var(--focus-ring);
}

.mps-counter {
  display: block;
  margin-top: var(--sp-1);
  text-align: end;
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.mps-teams-section {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.mps-teams-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
}

.mps-teams-title {
  font-size: var(--fs-sm);
  font-weight: 700;
}

.mps-teams {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 34vh;
  overflow-y: auto;
}

.mps-team {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  width: 100%;
  min-height: var(--tap-min);
  padding: var(--sp-1) var(--sp-3);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--surface);
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.mps-team--on {
  border-color: var(--accent);
  background: var(--accent-subtle);
}

.mps-check {
  display: grid;
  place-items: center;
  flex: none;
  width: 20px;
  height: 20px;
  border: 1.5px solid var(--border);
  border-radius: 6px;
  color: var(--on-accent);
}

.mps-team--on .mps-check {
  border-color: var(--accent);
  background: var(--accent);
}

.mps-badge {
  min-width: 0;
  flex: 1;
}

.mps-images {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
}

.mps-images-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.mps-hint {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.mps-footer {
  padding: var(--sp-3) var(--sp-4) calc(var(--sp-3) + var(--safe-bottom));
  border-top: 1px solid var(--border-light);
  background: var(--bg);
}
</style>
