<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { Download, Flag, Trash2 } from "@lucide/vue"
import { AppButton, AppChip, AppIcon, AppSheet } from "@/components/ui"
import { useMarketStore } from "../store"
import { useMarketActions } from "../composables/useMarketActions"
import { REPORT_REASONS } from "../constants"
import type { MarketListing, ReportReason } from "../types"

const props = defineProps<{ listing: MarketListing }>()
const emit = defineEmits<{ close: [] }>()

const { t, locale } = useI18n()
const market = useMarketStore()
const actions = useMarketActions()
const sheet = ref<InstanceType<typeof AppSheet> | null>(null)

const busy = ref(false)
const reporting = ref(false)
const isMine = computed(() => market.user?.uid === props.listing.authorUid)
const created = computed(() =>
  props.listing.createdAt ? new Date(props.listing.createdAt).toLocaleDateString(locale.value) : ""
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

const download = () => run(() => actions.download(props.listing))
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
        <AppButton variant="filled" :disabled="busy" @click="download">
          <AppIcon :icon="Download" size="xs" />
          {{ t("market.download") }}
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
.mds-reasons-title {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.mds-reasons-title {
  width: 100%;
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
