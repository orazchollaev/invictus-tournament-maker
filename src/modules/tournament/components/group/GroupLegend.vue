<script lang="ts" setup>
const { wildcardCount } = defineProps<{
  wildcardCount: number
}>()
</script>

<template>
  <div class="gs-legend">
    <span class="legend-item">
      <span class="legend-marker"></span>
      {{ $t("legend.qualifies") }}
    </span>

    <template v-if="(wildcardCount ?? 0) > 0">
      <span class="legend-item">
        <span class="legend-marker legend-marker--wildcard"></span>
        {{ $t("legend.wildcard", { count: wildcardCount }) }}
      </span>
    </template>

    <span class="legend-item">
      <span class="legend-marker legend-marker--out"></span>
      {{ $t("legend.eliminated") }}
    </span>
  </div>
</template>

<style scoped>
.gs-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-2);
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.legend-marker {
  width: 3px;
  height: 14px;
  background: var(--accent);
  flex-shrink: 0;
}
.legend-marker--wildcard {
  position: relative;
  width: 3px;
  height: 14px;
  opacity: 0.6;
  background: transparent;
}

.legend-marker--wildcard::before {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    to bottom,
    var(--accent) 0,
    var(--accent) 3px,
    transparent 3px,
    transparent 5px
  );
}

.legend-marker--out {
  background: var(--text-muted);
  opacity: 0.65;
}
</style>
