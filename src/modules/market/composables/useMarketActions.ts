import { useI18n } from "vue-i18n"
import { uid } from "@/engine"
import { showAlert, showConfirm } from "@/composables/useDialog"
import { logEvent } from "@/composables/useAnalytics"
import { useTeamsStore } from "@/modules/teams/store"
import { usePlayersStore } from "@/modules/players/store"
import { remapDatasetIds } from "@/modules/teams/utils/remapDataset"
import { useMarketStore } from "../store"
import { useMarketAd } from "./useMarketAd"
import * as api from "../services/marketApi"
import * as authService from "../services/authService"
import { buildDataset, type PublishDraft } from "../utils/buildDataset"
import type { MarketListing, ReportReason } from "../types"

/** Firebase's own wording differs by platform; match on the code it always carries. */
const needsRecentLogin = (e: unknown) => /requires-recent-login/i.test(String(e))

export function useMarketActions() {
  const { t } = useI18n()
  const market = useMarketStore()
  const teams = useTeamsStore()
  const players = usePlayersStore()
  const { onCommunityDatasetAdded } = useMarketAd()

  /** Returns false when the user cancels sign-in or it fails. */
  async function ensureSignedIn(): Promise<boolean> {
    if (market.user) return true
    try {
      return !!(await market.signIn())
    } catch {
      await showAlert(t("market.signInFailed"))
      return false
    }
  }

  async function download(listing: MarketListing): Promise<boolean> {
    const ok = await showConfirm(t("market.downloadConfirm", { name: listing.label }), {
      confirmLabel: t("market.download"),
    })
    if (!ok) return false
    try {
      const dataset = await api.downloadDataset(listing.id, !!market.user)
      if (!dataset) {
        await showAlert(t("market.invalidDataset"))
        return false
      }
      // Added on top of what is loaded, exactly like the bundled sample sets.
      const existing = new Set(teams.teams.map((x) => x.id))
      const out = remapDatasetIds(dataset.teams, dataset.players ?? [], existing, uid)
      teams.teams.push(...out.teams)
      players.players.push(...out.players)
      void logEvent("market_download", { type: dataset.type })
      // Every 3rd added dataset shows an interstitial — best effort, never blocks.
      void onCommunityDatasetAdded()
      await showAlert(t("market.downloaded", { name: listing.label }))
      return true
    } catch {
      await showAlert(t("market.networkError"))
      return false
    }
  }

  async function publish(draft: PublishDraft, teamIds: string[]): Promise<boolean> {
    if (!(await ensureSignedIn()) || !market.user) return false
    const picked = teams.teams.filter((x) => teamIds.includes(x.id))
    try {
      await api.publishDataset(buildDataset(draft, picked), market.user)
      void logEvent("market_publish", { type: draft.type })
      await market.load(true)
      return true
    } catch (e) {
      const tooLarge = e instanceof Error && e.message === "too-large"
      await showAlert(t(tooLarge ? "market.tooLarge" : "market.publishFailed"))
      return false
    }
  }

  async function remove(listing: MarketListing): Promise<boolean> {
    const ok = await showConfirm(t("market.deleteConfirm", { name: listing.label }), {
      confirmLabel: t("market.delete"),
      dangerous: true,
    })
    if (!ok) return false
    try {
      await api.deleteDataset(listing.id)
      market.removeListing(listing.id)
      return true
    } catch {
      await showAlert(t("market.networkError"))
      return false
    }
  }

  async function report(listing: MarketListing, reason: ReportReason): Promise<boolean> {
    if (!(await ensureSignedIn()) || !market.user) return false
    try {
      await api.reportDataset(listing.id, market.user.uid, reason)
    } catch {
      // A second report from the same user is rejected by the rules; to them it still counts as sent.
    }
    await showAlert(t("market.reported"))
    return true
  }

  /** Removes the user's published datasets, then the account itself. */
  async function deleteAccount(): Promise<boolean> {
    if (!market.user) return false
    const ok = await showConfirm(t("market.deleteAccountConfirm"), {
      confirmLabel: t("market.deleteAccount"),
      dangerous: true,
    })
    if (!ok) return false
    try {
      await api.deleteMyData(market.user.uid)
      await authService.deleteAccount()
      market.user = null
      await market.load(true)
      await showAlert(t("market.accountDeleted"))
      return true
    } catch (e) {
      await showAlert(t(needsRecentLogin(e) ? "market.reauthNeeded" : "market.networkError"))
      return false
    }
  }

  return { ensureSignedIn, download, publish, remove, report, deleteAccount }
}
