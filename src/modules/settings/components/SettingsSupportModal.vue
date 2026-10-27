<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import QRCode from "qrcode"
import { logEvent } from "@/composables/useAnalytics"
import { AppButton, AppModal } from "@/components/ui"
import { SUPPORT_ADDRESS, SUPPORT_NETWORK, SUPPORT_PAY_ID } from "@/modules/settings/constants"
import {
  classifySendError,
  openWalletPicker,
  readWalletAddress,
  sendSupport,
  walletSendEnabled,
  watchPicker,
  watchWallet,
} from "@/modules/settings/services/supportWallet"

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
})

onMounted(async () => {
  if (walletSendEnabled) {
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

      <section v-if="SUPPORT_PAY_ID" class="support-block">
        <h4 class="support-heading">{{ t("settings.support.payTitle") }}</h4>
        <p class="support-hint">{{ t("settings.support.payHint") }}</p>
        <code class="support-value">{{ SUPPORT_PAY_ID }}</code>
        <AppButton variant="filled" size="md" block @click="copy('payId', SUPPORT_PAY_ID)">
          {{ copiedKey === "payId" ? t("settings.support.copied") : t("settings.support.copyId") }}
        </AppButton>
      </section>

      <section v-if="walletSendEnabled" class="support-block">
        <h4 class="support-heading">{{ t("settings.support.walletTitle") }}</h4>
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

      <section class="support-block">
        <h4 class="support-heading">{{ t("settings.support.cryptoTitle") }}</h4>
        <img v-if="qr" :src="qr" :alt="t('settings.support.qrAlt')" class="support-qr" />
        <div class="support-network">
          {{ t("settings.support.network") }}: {{ SUPPORT_NETWORK }}
        </div>
        <code class="support-value">{{ SUPPORT_ADDRESS }}</code>
        <AppButton
          :variant="SUPPORT_PAY_ID ? 'outlined' : 'filled'"
          size="md"
          block
          @click="copy('address', SUPPORT_ADDRESS)"
        >
          {{ copiedKey === "address" ? t("settings.support.copied") : t("settings.support.copy") }}
        </AppButton>
        <p class="support-warning">{{ t("settings.support.warning") }}</p>
      </section>

      <section v-if="SUPPORT_PAY_ID" class="support-block">
        <h4 class="support-heading">{{ t("settings.support.howTitle") }}</h4>
        <ol class="support-steps">
          <li>{{ t("settings.support.step1") }}</li>
          <li>{{ t("settings.support.step2") }}</li>
          <li>{{ t("settings.support.step3") }}</li>
        </ol>
      </section>
    </div>
  </AppModal>
</template>

<style scoped>
.support {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  padding: var(--sp-4) var(--sp-3) var(--sp-3);
  text-align: center;
}
.support-intro {
  margin: 0;
  font-size: var(--fs-base);
  color: var(--text-muted);
}
.support-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  padding-top: var(--sp-4);
  border-top: 1px solid var(--border-light);
}
.support-heading {
  margin: 0;
  font-size: var(--fs-base);
  font-weight: 600;
}
.support-hint {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
.support-qr {
  width: 180px;
  height: 180px;
  border-radius: var(--radius);
}
.support-network {
  font-size: var(--fs-sm);
  font-weight: 600;
}
.support-value {
  max-width: 100%;
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  font-size: var(--fs-xs);
  word-break: break-all;
  user-select: all;
}
.support-warning {
  margin: 0;
  font-size: var(--fs-xs);
  line-height: 1.4;
  color: var(--text-muted);
}
.support-amounts {
  display: flex;
  gap: var(--sp-2);
}
.support-ok {
  margin: 0;
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--accent);
}
.support-steps {
  margin: 0;
  padding-inline-start: var(--sp-5);
  text-align: start;
  font-size: var(--fs-sm);
  line-height: 1.5;
  color: var(--text-muted);
}
</style>
