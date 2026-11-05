<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import QRCode from "qrcode"
import { logEvent } from "@/composables/useAnalytics"
import { AppButton, AppButtonGroup, AppModal } from "@/components/ui"
import { SUPPORT_ADDRESS, SUPPORT_NETWORK, SUPPORT_PAY_ID } from "@/modules/settings/constants"
import {
  classifySendError,
  openWalletPicker,
  readWalletAddress,
  sendSupport,
  walletSendEnabled,
  watchPicker,
  watchWallet,
  watchWalletSteps,
} from "@/modules/settings/services/supportWallet"
import { useSupportAd } from "@/modules/settings/composables/useSupportAd"

defineEmits<{ close: [] }>()

const { t } = useI18n()

const qr = ref("")
const copiedKey = ref<"payId" | "address" | null>(null)

const AMOUNTS = ["1", "3", "5"] as const
const walletAddress = ref<string>()
const amount = ref<string>("3")
const status = ref<"idle" | "sending" | "sent" | "failed">("idle")
let stopWatching: (() => void) | undefined
let stopPicker: (() => void) | undefined
let stopSteps: (() => void) | undefined

const { adAvailable, adStatus, watchAd } = useSupportAd()

type Method = "ad" | "pay" | "address" | "wallet"

/**
 * One way to give at a time, picked from a segmented control, so the whole
 * dialog fits a phone screen without scrolling. Ordered by how many people can
 * use each: anyone can watch an ad; the wallet needs USDT and BNB already in one.
 */
const methods = computed(() => {
  const list: { value: Method; label: string }[] = []
  if (adAvailable) list.push({ value: "ad", label: t("settings.support.tabAd") })
  if (SUPPORT_PAY_ID) list.push({ value: "pay", label: t("settings.support.tabPay") })
  list.push({ value: "address", label: t("settings.support.tabAddress") })
  if (walletSendEnabled) list.push({ value: "wallet", label: t("settings.support.tabWallet") })
  return list
})
const method = ref<Method>(methods.value[0].value)
watch(method, (m) => void logEvent("support_method", { method: m }))

function setWalletAddress(address: string | undefined) {
  if (address && !walletAddress.value) void logEvent("support_wallet_connected")
  walletAddress.value = address
}

async function connectWallet() {
  void logEvent("support_wallet_connect_tap")
  try {
    await openWalletPicker()
  } catch {
    // The picker never opened (library failed to load, WebView issue): not the same as a user walking away.
    status.value = "failed"
    void logEvent("support_wallet_connect_error")
  }
}

async function sendFromWallet() {
  status.value = "sending"
  void logEvent("support_wallet_send_tap", { amount: Number(amount.value) })
  try {
    await sendSupport(amount.value)
    status.value = "sent"
    void logEvent("support_wallet_send_result", { result: "sent", amount: Number(amount.value) })
  } catch (error) {
    // Rejected in the wallet, wrong network, or not enough USDT/BNB for gas.
    status.value = "failed"
    void logEvent("support_wallet_send_result", {
      result: "failed",
      reason: classifySendError(error),
      amount: Number(amount.value),
    })
  }
}

onUnmounted(() => {
  stopWatching?.()
  stopPicker?.()
  stopSteps?.()
})

onMounted(async () => {
  if (walletSendEnabled) {
    watchWalletSteps((step, wallet) => {
      void logEvent("support_wallet_step", { step: step.toLowerCase(), wallet: wallet ?? "" })
    })
      .then((stop) => (stopSteps = stop))
      .catch(() => {})
    watchWallet(setWalletAddress)
      .then((stop) => (stopWatching = stop))
      .catch(() => {})
    watchPicker(async () => {
      // The account callback can land just after the picker closes, so give it a beat,
      // then read the address directly in case the subscription missed the connect.
      await new Promise((resolve) => setTimeout(resolve, 500))
      setWalletAddress(await readWalletAddress().catch(() => undefined))
      if (!walletAddress.value) void logEvent("support_wallet_picker_closed")
    })
      .then((stop) => (stopPicker = stop))
      .catch(() => {})
  }
  try {
    // A QR needs hard black-on-white contrast to scan, whatever the app theme is.
    qr.value = await QRCode.toDataURL(SUPPORT_ADDRESS, {
      width: 360,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    })
  } catch {
    // The address below is still copyable without the code.
  }
})

async function copy(key: "payId" | "address", text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key
    void logEvent("support_copy", { kind: key })
    setTimeout(() => (copiedKey.value = null), 2000)
  } catch {
    // Clipboard blocked: the value is selectable text, so the user can copy by hand.
  }
}
</script>

<template>
  <!-- The wallet picker and the wallet's own window live outside this modal; touching them must not dismiss it. -->
  <AppModal
    :title="t('settings.support.title')"
    width="425px"
    :dismiss-on-outside-click="false"
    @close="$emit('close')"
  >
    <div class="support">
      <p class="support-intro">{{ t("settings.support.intro") }}</p>

      <AppButtonGroup v-if="methods.length > 1" v-model="method" :options="methods" block />

      <section v-if="method === 'ad'" class="support-panel">
        <p class="support-hint">{{ t("settings.support.adHint") }}</p>
        <p v-if="adStatus === 'thanks'" class="support-ok">{{ t("settings.support.adThanks") }}</p>
        <AppButton
          v-else
          variant="filled"
          size="md"
          block
          :disabled="adStatus === 'loading'"
          @click="watchAd"
        >
          {{
            adStatus === "loading"
              ? t("settings.support.adLoading")
              : t("settings.support.adButton")
          }}
        </AppButton>
        <p v-if="adStatus === 'failed'" class="support-warning">
          {{ t("settings.support.adFailed") }}
        </p>
      </section>

      <section v-else-if="method === 'pay'" class="support-panel">
        <p class="support-hint">{{ t("settings.support.payHint") }}</p>
        <div class="support-copy">
          <code class="support-value">{{ SUPPORT_PAY_ID }}</code>
          <AppButton variant="filled" size="md" @click="copy('payId', SUPPORT_PAY_ID)">
            {{
              copiedKey === "payId" ? t("settings.support.copied") : t("settings.support.copyId")
            }}
          </AppButton>
        </div>
        <ol class="support-steps">
          <li>{{ t("settings.support.step1") }}</li>
          <li>{{ t("settings.support.step2") }}</li>
          <li>{{ t("settings.support.step3") }}</li>
        </ol>
      </section>

      <section v-else-if="method === 'address'" class="support-panel">
        <p class="support-hint">{{ t("settings.support.cryptoTitle") }}</p>
        <div class="support-address">
          <img v-if="qr" :src="qr" :alt="t('settings.support.qrAlt')" class="support-qr" />
          <div class="support-address-info">
            <span class="support-network">
              {{ t("settings.support.network") }}: {{ SUPPORT_NETWORK }}
            </span>
            <code class="support-value">{{ SUPPORT_ADDRESS }}</code>
            <AppButton variant="filled" size="sm" block @click="copy('address', SUPPORT_ADDRESS)">
              {{
                copiedKey === "address" ? t("settings.support.copied") : t("settings.support.copy")
              }}
            </AppButton>
          </div>
        </div>
        <ol class="support-steps">
          <li>{{ t("settings.support.exStep1") }}</li>
          <li>{{ t("settings.support.exStep2") }}</li>
          <li>{{ t("settings.support.exStep3") }}</li>
        </ol>
        <p class="support-warning">{{ t("settings.support.warning") }}</p>
      </section>

      <section v-else class="support-panel">
        <p class="support-hint">{{ t("settings.support.walletHint") }}</p>
        <AppButton v-if="!walletAddress" variant="filled" size="md" block @click="connectWallet">
          {{ t("settings.support.connect") }}
        </AppButton>
        <template v-else>
          <div class="support-amounts">
            <AppButton
              v-for="a in AMOUNTS"
              :key="a"
              :variant="amount === a ? 'filled' : 'outlined'"
              size="md"
              @click="amount = a"
            >
              {{ a }} USDT
            </AppButton>
          </div>
          <AppButton
            variant="filled"
            size="md"
            block
            :disabled="status === 'sending'"
            @click="sendFromWallet"
          >
            {{
              status === "sending"
                ? t("settings.support.sending")
                : t("settings.support.sendNow", { amount })
            }}
          </AppButton>
        </template>
        <p v-if="status === 'sent'" class="support-ok">{{ t("settings.support.sent") }}</p>
        <p v-else-if="status === 'failed'" class="support-warning">
          {{ t("settings.support.failed") }}
        </p>
      </section>
    </div>
  </AppModal>
</template>

<style scoped>
.support {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-3);
}
.support-intro {
  margin: 0;
  font-size: var(--fs-sm);
  line-height: 1.45;
  color: var(--text-muted);
  text-align: center;
}
.support-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.support-hint {
  margin: 0;
  font-size: var(--fs-sm);
  line-height: 1.45;
  text-align: center;
}
.support-copy {
  display: flex;
  align-items: stretch;
  gap: var(--sp-2);
}
.support-copy .support-value {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-base);
  font-weight: 600;
}
.support-address {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.support-qr {
  flex: none;
  width: 120px;
  height: 120px;
  border-radius: var(--radius);
}
.support-address-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--sp-2);
  min-width: 0;
}
.support-network {
  font-size: var(--fs-xs);
  font-weight: 600;
}
.support-value {
  padding: var(--sp-2);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  font-size: var(--fs-xs);
  line-height: 1.35;
  word-break: break-all;
  user-select: all;
}
.support-steps {
  margin: 0;
  padding: var(--sp-2) var(--sp-3) var(--sp-2) var(--sp-6);
  border-radius: var(--radius);
  background: var(--surface-2);
  font-size: var(--fs-sm);
  line-height: 1.5;
  color: var(--text-muted);
}
.support-warning {
  margin: 0;
  font-size: var(--fs-xs);
  line-height: 1.4;
  color: var(--text-muted);
  text-align: center;
}
.support-amounts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-2);
}
.support-ok {
  margin: 0;
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--accent);
  text-align: center;
}
</style>
