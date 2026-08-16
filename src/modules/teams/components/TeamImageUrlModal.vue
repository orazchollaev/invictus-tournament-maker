<script setup lang="ts">
import { ref } from "vue"
import { AppModal, AppButton } from "@/components/ui"
import { useI18n } from "vue-i18n"

const emit = defineEmits<{
  close: []
  "update:modelValue": [string]
}>()

const { t } = useI18n()
const modal = ref<InstanceType<typeof AppModal> | null>(null)
const url = ref("")

function submit() {
  const trimmed = url.value.trim()
  if (!trimmed) return
  emit("update:modelValue", trimmed)
}
</script>

<template>
  <AppModal
    ref="modal"
    :title="t('teams.form.imageUrlTitle')"
    :z-index="210"
    @close="emit('close')"
  >
    <input
      v-model="url"
      class="input-full"
      type="url"
      :placeholder="t('teams.form.imageUrlPlaceholder')"
      autofocus
      @keyup.enter="submit"
    />

    <template #footer>
      <AppButton variant="filled" :disabled="!url.trim()" @click="submit">
        {{ t("common.save") }}
      </AppButton>
      <AppButton @click="modal?.close()">{{ t("common.cancel") }}</AppButton>
    </template>
  </AppModal>
</template>

<style scoped>
.input-full {
  width: 100%;
}
</style>
