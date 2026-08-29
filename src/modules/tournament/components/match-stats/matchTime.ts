// How a minute is written on a scoreboard.
//
// `MatchEvent.minute` is a plain ordinal with no period attached, so the
// same number reads differently depending on how far the tie went: 93 is
// "90+3" in a match that ended at ninety, and simply the 93rd minute in one
// that went to extra time. (The generator never produces both in the same
// match, precisely so this stays decidable — see engine/events/generate.ts.)
import { FULL_TIME_MINUTES, REGULATION_MINUTES } from "@/engine"

export function formatMinute(minute: number, hasExtraTime = false): string {
  const end = hasExtraTime ? FULL_TIME_MINUTES : REGULATION_MINUTES
  return minute > end ? `${end}+${minute - end}` : `${minute}`
}
