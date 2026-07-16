import { reactive } from "vue"
import type { Match, MatchResult } from "../../types"

export interface FlatMatch extends Match {
  _origRound: number
  _origMatch: number
  _isThirdPlace?: boolean
}

/** Shared score/penalty edit state — one editor open at a time across the fixture grid. */
export function useMatchEditor() {
  const editor = reactive({
    key: null as string | null,
    mode: "score" as "score" | "penalty",
    home: 0,
    away: 0,
    penHome: 0,
    penAway: 0,

    getEditKey(match: FlatMatch, leg: 1 | 2 = 1): string {
      return match.leg2Result !== undefined ? `${match.id}_leg${leg}` : match.id
    },
    startEdit(match: FlatMatch, leg: 1 | 2 = 1) {
      editor.key = editor.getEditKey(match, leg)
      editor.mode = "score"
      const src: MatchResult | null | undefined = leg === 2 ? match.leg2Result : match.result
      editor.home = src?.home ?? 0
      editor.away = src?.away ?? 0
      editor.penHome = src?.penHome ?? 0
      editor.penAway = src?.penAway ?? 0
    },
    cancel() {
      editor.key = null
      editor.mode = "score"
    },
    isEditing(match: FlatMatch, leg: 1 | 2 = 1): boolean {
      return editor.key === editor.getEditKey(match, leg)
    },
  })
  return editor
}

export type MatchEditor = ReturnType<typeof useMatchEditor>
