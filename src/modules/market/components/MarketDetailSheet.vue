<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { Check, Download, Flag, Trash2 } from "@lucide/vue"
import { AppButton, AppChip, AppIcon, AppSearchInput, AppSheet } from "@/components/ui"
import { TeamBadge } from "@/modules/teams/components"
import { useMarketStore } from "../store"
import { useMarketActions } from "../composables/useMarketActions"
import { useMarketPreview } from "../composables/useMarketPreview"
import { REPORT_REASONS } from "../constants"
import type { MarketListing, ReportReason } from "../types"

const props = defineProps<{ listing: MarketListing }>()
const emit = defineEmits<{ close: [] }>()

const { t, locale } = useI18n()
const market = useMarketStore()
const actions = useMarketActions()
const preview = useMarketPreview(props.listing)
const sheet = ref<InstanceType<typeof AppSheet> | null>(null)

const busy = ref(false)
const reporting = ref(false)
const isMine = computed(() => market.user?.uid === props.listing.authorUid)
const created = computed(() =>
  props.listing.createdAt ? new Date(props.listing.createdAt).toLocaleDateString(locale.value) : ""
)
const canDownload = computed(
  () => !busy.value && !!preview.dataset.value && preview.picked.value.size > 0
)

async function run(task: () => Promise<boolean>) {
  if (busy.value) return
  busy.value = true
  try {
    if (await task()) sheet.value?.close()
  } finally {
    busy.value = false
  }
}

const download = () => {
  const dataset = preview.dataset.value
  if (!dataset) return
  return run(() => actions.download(props.listing, dataset, preview.picked.value))
}
const remove = () => run(() => actions.remove(props.listing))
const report = (reason: ReportReason) => run(() => actions.report(props.listing, reason))
</script>

<template>
  <AppSheet ref="sheet" :title="listing.label" @close="emit('close')">
    <div class="mds-body">
      <p class="mds-desc">{{ listing.description }}</p>

      <div class="mds-chips">
        <AppChip variant="accent">{{ t(`market.type.${listing.type}`) }}</AppChip>
        <AppChip>{{ t("common.teams", { n: listing.teamCount }) }}</AppChip>
        <AppChip>
          <AppIcon :icon="Download" size="xs" />
          {{ listing.downloads }}
        </AppChip>
      </div>

      <p class="mds-author">
        {{ t("market.by", { name: listing.authorName }) }}
        <template v-if="created">· {{ created }}</template>
      </p>

      <section class="mds-preview">
        <p v-if="preview.loading.value" class="mds-note">{{ t("market.previewLoading") }}</p>

        <p v-else-if="preview.error.value" class="mds-note">
          {{
            preview.error.value === "invalid"
              ? t("market.invalidDataset")
              : t("market.networkError")
          }}
          <AppButton v-if="preview.error.value === 'network'" size="xs" @click="preview.load()">
            {{ t("market.retry") }}
          </AppButton>
        </p>

        <template v-else>
          <p v-if="preview.stats.value" class="mds-stats">
            {{
              t("market.previewStats", {
                avg: preview.stats.value.average,
                top: preview.stats.value.strongest.name,
                players: preview.stats.value.players,
              })
            }}
          </p>

          <div class="mds-preview-head">
            <span class="mds-preview-title">
              {{
                t("market.previewSelected", {
                  n: preview.picked.value.size,
                  total: listing.teamCount,
                })
              }}
            </span>
            <AppButton size="xs" variant="text" @click="preview.toggleVisible()">
              {{ preview.allVisiblePicked.value ? t("market.clearAll") : t("market.selectAll") }}
            </AppButton>
          </div>

          <AppSearchInput
            v-if="listing.teamCount > 8"
            v-model="preview.query.value"
            :placeholder="t('market.previewSearch')"
          />

          <ul class="mds-teams">
            <li v-for="row in preview.visible.value" :key="row.team.id">
              <button
                type="button"
                class="mds-team"
                :class="{ 'mds-team--on': preview.picked.value.has(row.team.id) }"
                :aria-pressed="preview.picked.value.has(row.team.id)"
                @click="preview.toggle(row.team.id)"
              >
                <span class="mds-check" aria-hidden="true">
                  <AppIcon v-if="preview.picked.value.has(row.team.id)" :icon="Check" size="xs" />
                </span>
                <TeamBadge :team="row.team" :size="20" class="mds-badge" />
                <span v-if="row.players" class="mds-meta">
                  {{ t("market.previewPlayers", { n: row.players }) }}
                </span>
                <span class="mds-power">{{ row.team.power }}</span>
              </button>
            </li>
          </ul>
          <p v-if="!preview.visible.value.length" class="mds-note">
            {{ t("market.noMatch", { query: preview.query.value }) }}
          </p>
        </template>
      </section>

      <div v-if="reporting" class="mds-reasons">
        <span class="mds-reasons-title">{{ t("market.reportReason") }}</span>
        <AppButton
          v-for="reason in REPORT_REASONS"
          :key="reason"
          :disabled="busy"
          @click="report(reason)"
        >
          {{ t(`market.reason.${reason}`) }}
        </AppButton>
      </div>
    </div>

    <template #footer>
      <div class="mds-footer">
        <AppButton v-if="isMine" variant="danger" :disabled="busy" @click="remove">
          <AppIcon :icon="Trash2" size="xs" />
          {{ t("market.delete") }}
        </AppButton>
        <AppButton v-else :disabled="busy" @click="reporting = !reporting">
          <AppIcon :icon="Flag" size="xs" />
          {{ t("market.report") }}
        </AppButton>
        <AppButton variant="filled" :disabled="!canDownload" @click="download">
          <AppIcon :icon="Download" size="xs" />
          {{ t("market.downloadN", { n: preview.picked.value.size }) }}
        </AppButton>
      </div>
    </template>
  </AppSheet>
</template>

<style scoped>
.mds-body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  min-width: 0;
  padding: var(--sp-3);
}

.mds-desc {
  margin: 0;
  overflow-wrap: anywhere;
}

.mds-chips,
.mds-reasons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-2);
}

.mds-author,
.mds-reasons-title,
.mds-stats,
.mds-note {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.mds-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
}

.mds-reasons-title {
  width: 100%;
}

.mds-preview {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  min-width: 0;
}

.mds-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
}

.mds-preview-title {
  font-size: var(--fs-sm);
  font-weight: 700;
}

.mds-teams {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 40vh;
  overflow-y: auto;
}

.mds-team {
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

.mds-team--on {
  border-color: var(--accent);
  background: var(--accent-subtle);
}

.mds-check {
  display: grid;
  place-items: center;
  flex: none;
  width: 20px;
  height: 20px;
  border: 1.5px solid var(--border);
  border-radius: 6px;
  color: var(--on-accent);
}

.mds-team--on .mds-check {
  border-color: var(--accent);
  background: var(--accent);
}

.mds-badge {
  min-width: 0;
  flex: 1;
}

.mds-meta {
  flex: none;
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.mds-power {
  flex: none;
  min-width: 2ch;
  text-align: end;
  font-size: var(--fs-sm);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.mds-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3) calc(var(--sp-2) + var(--safe-bottom));
  border-top: 1px solid var(--border-light);
  background: var(--bg);
}
</style>
