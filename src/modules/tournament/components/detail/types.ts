/**
 * A custom tournament has one tab per phase, and there is no telling how many
 * or what they are called until the user has drawn the graph — hence the
 * template-literal arm rather than a fixed name. Use the two helpers below
 * instead of building or slicing the string by hand.
 */
export type PhaseTab = `phase:${string}`

export type MainTab =
  | "manager"
  | "groups"
  | "fixtures"
  | "bracket"
  | "league"
  | "stats"
  | "participants"
  | PhaseTab

export function phaseTab(phaseId: string): PhaseTab {
  return `phase:${phaseId}`
}

export function isPhaseTab(tab: MainTab): tab is PhaseTab {
  return tab.startsWith("phase:")
}

/** The phase id a tab refers to, or undefined for every fixed tab. */
export function phaseIdOf(tab: MainTab): string | undefined {
  return isPhaseTab(tab) ? tab.slice("phase:".length) : undefined
}
