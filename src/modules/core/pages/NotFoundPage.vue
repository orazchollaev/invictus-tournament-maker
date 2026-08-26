<script setup lang="ts">
import { useRouter } from "vue-router"
import { useI18n } from "vue-i18n"

const router = useRouter()
const { t } = useI18n()
</script>

<template>
  <div class="not-found">
    <div class="code">404</div>
    <p class="message">{{ t("notFound.message") }}</p>
    <button class="primary" @click="router.push('/')">{{ t("notFound.goHome") }}</button>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  gap: 12px;
}
.code {
  font-size: 72px;
  font-weight: 700;
  color: var(--text-muted);
  line-height: 1;
}
.message {
  font-size: 16px;
  color: var(--text-muted);
}
</style>
