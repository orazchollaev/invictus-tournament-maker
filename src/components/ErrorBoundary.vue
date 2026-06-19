<script setup lang="ts">
import { ref, onErrorCaptured } from "vue"
import { useI18n } from "vue-i18n"
import { AlertTriangle } from "@lucide/vue"

const { t } = useI18n()
const error = ref<Error | null>(null)

onErrorCaptured((err) => {
  error.value = err instanceof Error ? err : new Error(String(err))
  return false
})

function retry() {
  error.value = null
}
</script>

<template>
  <div v-if="error" class="error-boundary">
    <AlertTriangle :size="36" class="error-icon" />
    <p class="error-msg">{{ t("common.errorBoundaryMsg") }}</p>
    <button class="primary sm" @click="retry">{{ t("common.retry") }}</button>
  </div>
  <slot v-else />
</template>

<style scoped>
.error-boundary {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 14px;
  text-align: center;
  min-height: 200px;
}
.error-icon {
  color: var(--text-muted);
  opacity: 0.4;
}
.error-msg {
  color: var(--text-muted);
  font-size: 14px;
  max-width: 260px;
}
</style>
