<script setup lang="ts">
/**
 * Form row: label + control + hint. Replaces the
 * `.form-row` / `.form-label` / `.form-hint` triple that was
 * hand-assembled in 21 places.
 *
 * layout  row     label left, control right (default, desktop forms)
 *         stack   label above control (narrow columns, modals)
 *         split   label left, control pushed to the far right — the
 *                 settings-page pattern, with an optional description
 */
withDefaults(
  defineProps<{
    label?: string
    hint?: string
    /** Longer explanatory text under the label; implies `split`. */
    description?: string
    layout?: "row" | "stack" | "split"
    labelWidth?: "sm" | "md" | "lg"
  }>(),
  {
    layout: "row",
    labelWidth: "sm",
  }
)
</script>

<template>
  <div class="field" :class="[`field--${layout}`]">
    <div class="field-info" :class="[`field-label--${labelWidth}`]">
      <label v-if="label || $slots.label" class="field-label">
        <slot name="label">{{ label }}</slot>
      </label>
      <!-- Raw slot: settings rows pass SettingDesc, which brings its own
           responsive desktop-text / mobile-popover wrapper. -->
      <slot name="description">
        <p v-if="description" class="field-desc">{{ description }}</p>
      </slot>
    </div>

    <div class="field-control">
      <slot />
    </div>

    <p v-if="hint" class="field-hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
  min-width: 0;
}

.field--stack {
  flex-direction: column;
  align-items: stretch;
  gap: var(--sp-1);
}

.field--split .field-control {
  margin-left: auto;
  flex-shrink: 0;
}

.field-info {
  flex-shrink: 0;
  min-width: 0;
}
.field--split .field-info,
.field--stack .field-info {
  flex: 1;
}

.field-label--sm {
  width: 140px;
}
.field-label--md {
  width: 160px;
}
.field-label--lg {
  width: 200px;
}
.field--split .field-label--sm,
.field--split .field-label--md,
.field--split .field-label--lg,
.field--stack .field-label--sm,
.field--stack .field-label--md,
.field--stack .field-label--lg {
  width: auto;
}

.field-label {
  display: block;
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
}

.field-desc {
  margin: 2px 0 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
  line-height: 1.4;
}

.field-control {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
  width: 100%;
}

.field-hint {
  margin: 0;
  flex-basis: 100%;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

@media (max-width: 600px) {
  .field {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--sp-2);
  }
  .field-label--sm,
  .field-label--md,
  .field-label--lg {
    width: auto;
    flex: 1 1 100%;
  }
  .field--split {
    flex-direction: row;
    align-items: center;
  }
  .field--split .field-info {
    flex: 1;
  }
}
</style>
