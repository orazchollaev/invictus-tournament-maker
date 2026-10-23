import { computed, type Ref } from "vue"
import type { Tournament } from "@/modules/tournament/types"
import { useTeamMatchHistory } from "./useTeamMatchHistory"
import { summarizeHeadToHead } from "../utils/headToHead"

/**
 * Everything the compare page shows for two teams: each side's overall record,
 * plus the matches they played against each other (from A's side, latest first).
 */
export function useHeadToHead(tournaments: Ref<Tournament[]>, aId: Ref<string>, bId: Ref<string>) {
  const a = useTeamMatchHistory(tournaments, aId)
  const b = useTeamMatchHistory(tournaments, bId)

  const meetings = computed(() =>
    aId.value && bId.value ? a.matches.value.filter((m) => m.opponentId === bId.value) : []
  )
  const summary = computed(() => summarizeHeadToHead(meetings.value))

  return { statsA: a.stats, statsB: b.stats, meetings, summary }
}
