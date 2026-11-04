<script setup lang="ts">
import { onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { Store } from "@lucide/vue"
import { AppButton, AppCard, AppField, AppIcon } from "@/components/ui"
import { useMarketStore } from "@/modules/market/store"
import { useMarketActions } from "@/modules/market/composables/useMarketActions"
import SettingDesc from "./SettingDesc.vue"

const { t } = useI18n()
const router = useRouter()
const market = useMarketStore()
const actions = useMarketActions()

// Shown while the Google account picker is up, so a sign-in that never comes
// back is visible as such instead of looking like a dead button.
const signingIn = ref(false)

async function signIn() {
  if (signingIn.value) return
  signingIn.value = true
  try {
    await actions.ensureSignedIn()
  } finally {
    signingIn.value = false
  }
}

onMounted(() => market.init())
</script>

<template>
  <AppCard padding="md">
    <template #title>
      <AppIcon :icon="Store" size="md" />
      {{ t("market.title") }}
    </template>

    <AppField layout="split" :label="t('market.settingsOpenLabel')">
      <template #description>
        <SettingDesc>{{ t("market.settingsIntro") }}</SettingDesc>
      </template>
      <AppButton variant="filled" @click="router.push('/market')">{{ t("market.open") }}</AppButton>
    </AppField>

    <AppField layout="split" :label="t('market.account')">
      <template #description>
        <SettingDesc>
          {{
            market.user
              ? t("market.signedInAs", { name: market.user.name })
              : t("market.signInHint")
          }}
        </SettingDesc>
      </template>
      <template v-if="market.user">
        <AppButton @click="market.signOut()">{{ t("market.signOut") }}</AppButton>
        <AppButton variant="danger" @click="actions.deleteAccount()">
          {{ t("market.deleteAccount") }}
        </AppButton>
      </template>
      <AppButton v-else :disabled="signingIn" @click="signIn">
        {{ signingIn ? t("market.signingIn") : t("market.signIn") }}
      </AppButton>
    </AppField>
  </AppCard>
</template>
