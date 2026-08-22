// Shared presentation rules for match events, so the timeline, the
// player tables and the player detail page all label a goal the same way.
import { Goal, CircleSlash, Volleyball } from "@lucide/vue"
import type { Component } from "vue"
import type { MatchEventType } from "../../types"

export interface EventMeta {
  /** "card" renders the CSS card glyph instead of an icon. */
  kind: "icon" | "card"
  icon?: Component
  /** CSS colour token the event is drawn in. */
  color: string
  /** i18n key for the event's name. */
  labelKey: string
  /** Short marker appended to the scorer, e.g. "(P)". */
  suffixKey?: string
  /** Goals, own goals and penalties change the score; cards do not. */
  isGoal: boolean
}

export const EVENT_META: Record<MatchEventType, EventMeta> = {
  goal: {
    kind: "icon",
    icon: Goal,
    color: "var(--accent)",
    labelKey: "matchStats.events.goal",
    isGoal: true,
  },
  penGoal: {
    kind: "icon",
    icon: Goal,
    color: "var(--accent-2)",
    labelKey: "matchStats.events.penGoal",
    suffixKey: "matchStats.events.penShort",
    isGoal: true,
  },
  ownGoal: {
    kind: "icon",
    icon: Volleyball,
    color: "var(--danger)",
    labelKey: "matchStats.events.ownGoal",
    suffixKey: "matchStats.events.ownShort",
    isGoal: true,
  },
  penMiss: {
    kind: "icon",
    icon: CircleSlash,
    color: "var(--text-muted)",
    labelKey: "matchStats.events.penMiss",
    isGoal: false,
  },
  yellow: {
    kind: "card",
    color: "var(--warning)",
    labelKey: "matchStats.events.yellow",
    isGoal: false,
  },
  red: { kind: "card", color: "var(--danger)", labelKey: "matchStats.events.red", isGoal: false },
}
