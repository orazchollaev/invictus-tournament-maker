import { useI18n } from "vue-i18n"

/** Translate function shape, matching vue-i18n's `t`. */
type Translate = (key: string, params?: Record<string, unknown>) => string

const RULES: Array<[RegExp, string, (m: RegExpMatchArray) => Record<string, unknown>]> = [
  [/^Final$/, "rounds.final", () => ({})],
  [/^Semi-Finals$/, "rounds.semiFinals", () => ({})],
  [/^Quarter-Finals$/, "rounds.quarterFinals", () => ({})],
  [/^Round of (\d+)$/, "rounds.roundOf", (m) => ({ n: Number(m[1]), k: Number(m[1]) / 2 })],
  [/^Matchday (\d+)$/, "rounds.matchday", (m) => ({ n: Number(m[1]) })],
  [/^Group ([A-Z])$/, "manualDraw.groupLabel", (m) => ({ name: m[1] })],
  [/^Pot (\d+)$/, "drawCeremony.potLabel", (m) => ({ n: Number(m[1]) })],
  [/^Pot$/, "drawCeremony.potSingle", () => ({})],
  [/^BYE (\d+)$/, "drawCeremony.byeSlot", (m) => ({ n: Number(m[1]) })],
  [/^Match (\d+)$/, "drawCeremony.matchSlot", (m) => ({ n: Number(m[1]) })],
  [/^Wildcards$/, "drawCeremony.wildcardsPot", () => ({})],
  [/^Group Winners$/, "drawCeremony.groupWinnersPot", () => ({})],
  [/^Runners-up$/, "drawCeremony.runnersUpPot", () => ({})],
  [/^Rank (\d+)$/, "drawCeremony.rankPot", (m) => ({ n: Number(m[1]) })],
]

/**
 * The engine names things in English — round names ("Semi-Finals"), group names
 * ("Group A"), matchday names ("Matchday 3") and draw-ceremony slot labels
 * ("Pot 2", "BYE 1", "Match 4"). Those strings are also *persisted* inside every
 * saved tournament, so they cannot simply be swapped for i18n keys without
 * breaking existing data.
 *
 * This is the display-side translation: it recognises the engine's vocabulary
 * and renders it in the active locale, falling back to the raw string for
 * anything it does not know (a user-typed tier name, for instance).
 *
 * Only for display. Never feed the result back into engine logic or use it as a
 * grouping key — the raw English label is the stable identity.
 */
export function createEngineLabel(t: Translate) {
  return function engineLabel(raw: string | null | undefined): string {
    if (!raw) return ""
    for (const [re, key, params] of RULES) {
      const m = raw.match(re)
      if (m) return t(key, params(m))
    }
    return raw
  }
}

/** Component-facing wrapper around {@link createEngineLabel}. */
export function useEngineLabels() {
  const { t } = useI18n()
  return { engineLabel: createEngineLabel(t as Translate) }
}
