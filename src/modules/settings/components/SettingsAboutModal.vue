<script setup lang="ts">
import { APP_VERSION } from "@/constants"
import { useI18n } from "vue-i18n"
import { AppModal } from "@/components/ui"

defineEmits<{ close: [] }>()

const { t } = useI18n()

const CONTRIBUTORS = ["Rodrigo Hernandez"]
</script>

<template>
  <AppModal :title="t('settings.about')" width="425px" @close="$emit('close')">
    <div class="about">
      <div class="about-logos">
        <img src="/logo/invictus-logo.webp" alt="invictus dev" class="about-logo about-logo--app" />
        <img
          src="/logo/shiftfn-logo.webp"
          alt="shiftfn dev"
          class="about-logo about-logo--shiftfn"
        />
      </div>

      <h3 class="about-title">Invictus {{ t("settings.aboutBy") }} ShiftFn Dev</h3>
      <span class="about-version">v{{ APP_VERSION }}</span>

      <div class="about-thanks">
        <span class="about-thanks-title">{{ t("settings.specialThanks") }}</span>
        <ul class="about-thanks-list">
          <li v-for="name in CONTRIBUTORS" :key="name">{{ name }}</li>
        </ul>
      </div>
    </div>
  </AppModal>
</template>

<style scoped>
.about {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-5) var(--sp-3) var(--sp-3);
  text-align: center;
}

.about-logos {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-4);
  margin-bottom: var(--sp-2);

  img {
    border-radius: 12px;
  }
}
.about-logo {
  color: var(--accent);
}
.about-logo--app {
  width: 64px;
  height: auto;
}
.about-logo--shiftfn {
  height: 64px;
  width: auto;
}
.about-logos-x {
  font-size: var(--fs-xl);
  color: var(--text-muted);
  opacity: 0.5;
}

.about-title {
  margin: 0;
  font-size: var(--fs-xl);
  font-weight: 700;
}
.about-version {
  font-size: var(--fs-base);
  color: var(--text-muted);
}

.about-thanks {
  width: 100%;
  margin-top: var(--sp-4);
  padding-top: var(--sp-4);
  border-top: 1px solid var(--border-light);
}
.about-thanks-title {
  display: block;
  font-size: var(--fs-base);
  font-weight: 600;
  margin-bottom: var(--sp-2);
}
.about-thanks-title::after {
  content: ":";
}
.about-thanks-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}
.about-thanks-list li {
  font-size: var(--fs-base);
  color: var(--text-muted);
}
</style>
