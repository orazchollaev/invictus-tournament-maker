<script setup lang="ts" generic="K extends string">
/**
 * One entry on a list page — a tournament, team, player, history series or
 * market dataset — in either of the two views those pages offer:
 *
 *   list   lead · title over subtitle · trail · ⋯
 *   grid   lead and ⋯ across the top, title, then subtitle and trail
 *
 * Deliberately quiet: a hairline card, no colour washes or glow — the crest
 * or avatar in the lead is the only colour on it. The whole card opens the
 * entry; secondary actions live in the ⋯ menu rather than on every row.
 *
 * Slots: lead, subtitle (when it needs markup), trail. An entry with no crest
 * or avatar passes `leadIcon` instead, drawn at a crest's size so the column
 * of leads lines up.
 */
import type { Component } from "vue"
import AppMenu, { type AppMenuItem } from "./AppMenu.vue"

withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    layout?: "list" | "grid"
    leadIcon?: Component
    menu?: AppMenuItem<K>[]
    /** Accessible name for the ⋯ button. */
    menuLabel?: string
  }>(),
  { layout: "list", menuLabel: "" }
)

const emit = defineEmits<{ open: []; select: [key: K] }>()

function onKey(e: KeyboardEvent) {
  if (e.target !== e.currentTarget) return
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault()
    emit("open")
  }
}
</script>

<template>
  <div
    class="li"
    :class="`li--${layout}`"
    role="link"
    tabindex="0"
    @click="emit('open')"
    @keydown="onKey"
  >
    <span v-if="$slots.lead || leadIcon" class="li-lead">
      <slot name="lead">
        <component :is="leadIcon" :size="26" :stroke-width="1.75" />
      </slot>
    </span>

    <span class="li-text">
      <span class="li-title">{{ title }}</span>
      <span v-if="$slots.subtitle || subtitle" class="li-subtitle">
        <slot name="subtitle">{{ subtitle }}</slot>
      </span>
    </span>

    <span v-if="$slots.trail" class="li-trail">
      <slot name="trail" />
    </span>

    <!-- Stops here so opening the menu never also opens the entry. -->
    <span v-if="menu?.length" class="li-menu" @click.stop @keydown.stop>
      <AppMenu :items="menu" :label="menuLabel" @select="emit('select', $event)" />
    </span>
  </div>
</template>

<style scoped>
.li {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-width: 0;
  padding: var(--sp-2) var(--sp-1) var(--sp-2) var(--sp-3);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--surface);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease);
}
.li:hover {
  background: var(--bg-hover);
}
.li:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.li-lead {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  color: var(--text-muted);
}

.li-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

.li-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--text);
}

.li-subtitle {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.li-trail {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-shrink: 0;
}

.li-menu {
  display: flex;
  flex-shrink: 0;
}
/* The ⋯ button is the outlined one from the detail header; borderless here so
   a page of rows is not a column of boxes. */
.li-menu :deep(.btn) {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: var(--text-muted);
}

/* ── Grid: the list row's parts restacked, at the list row's scale ── */
.li--grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    "lead  lead"
    "text  text"
    "trail trail";
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-2) var(--sp-2) var(--sp-2) var(--sp-3);
}

.li--grid .li-lead {
  grid-area: lead;
  justify-content: flex-start;
  width: auto;
  height: 28px;
}
.li--grid .li-text {
  grid-area: text;
}
.li--grid .li-trail {
  grid-area: trail;
  justify-content: space-between;
}
.li--grid .li-menu {
  position: absolute;
  top: 2px;
  inset-inline-end: 0;
}

@media (prefers-reduced-motion: reduce) {
  .li {
    transition: none;
  }
}
</style>
