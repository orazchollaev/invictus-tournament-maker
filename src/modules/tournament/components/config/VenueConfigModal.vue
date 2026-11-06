<script setup lang="ts">
/**
 * Where a tournament's matches are played: its own home edge, and whether a
 * one-off final goes to neutral ground. Used by both the create page and the
 * settings page — neither setting touches a fixture, so the two pages need
 * nothing different from it.
 */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { AppButton, AppModal, AppStepper, AppToggle } from "@/components/ui"
import { useSettingsStore } from "@/modules/settings/store"
import type { VenueConfigPayload } from "./types"

const props = withDefaults(
  defineProps<
    VenueConfigPayload & {
      /** False where there is no final to move — a league without a playoff, or a custom graph. */
      showNeutralFinal?: boolean
    }
  >(),
  { showNeutralFinal: true }
)

const emit = defineEmits<{ save: [VenueConfigPayload]; close: [] }>()

const { t } = useI18n()
const settings = useSettingsStore()

const modalRef = ref<InstanceType<typeof AppModal>>()
const custom = ref(props.homeAdvantage !== null)
const value = ref(props.homeAdvantage ?? settings.homeAdvantage)
const neutralFinal = ref(props.neutralFinal)

const appDefaultHint = computed(() =>
  t("tournament.venue.appDefaultHint", { n: settings.homeAdvantage })
)

function handleSave() {
  emit("save", {
    homeAdvantage: custom.value ? value.value : null,
    neutralFinal: props.showNeutralFinal && neutralFinal.value,
  })
  modalRef.value?.close()
}
</script>

<template>
  <AppModal
    ref="modalRef"
    :title="t('tournament.venue.title')"
    width="420px"
    @close="emit('close')"
  >
    <div class="form-card">
      <div class="form-section-title">{{ t("tournament.venue.homeAdvantage") }}</div>
      <div class="toggle-row" @click="custom = !custom">
        <AppToggle v-model="custom" @click.stop />
        <span class="toggle-label">{{ t("tournament.venue.customHomeAdvantage") }}</span>
        <span class="toggle-hint">{{ appDefaultHint }}</span>
      </div>
      <AppStepper
        v-if="custom"
        v-model="value"
        :label="t('tournament.venue.homeAdvantage')"
        :min="0"
        :max="20"
        :hint="t('tournament.venue.homeAdvantageHint')"
      />
    </div>

    <div v-if="showNeutralFinal" class="form-card">
      <div class="toggle-row" @click="neutralFinal = !neutralFinal">
        <AppToggle v-model="neutralFinal" @click.stop />
        <span class="toggle-label">{{ t("tournament.venue.neutralFinal") }}</span>
        <span class="toggle-hint">{{ t("tournament.venue.neutralFinalHint") }}</span>
      </div>
    </div>

    <template #footer>
      <AppButton variant="filled" block @click="handleSave">{{ t("common.save") }}</AppButton>
    </template>
  </AppModal>
</template>
