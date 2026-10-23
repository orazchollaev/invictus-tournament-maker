<script setup lang="ts">
import { FlagCircle } from "@/modules/teams/components"

defineProps<{ active: boolean }>()

const ROWS = [
  { code: "br", abbr: "BRA", pts: 9 },
  { code: "tr", abbr: "TUR", pts: 6 },
  { code: "de", abbr: "GER", pts: 4 },
  { code: "jp", abbr: "JPN", pts: 1 },
]
const MAX = 9
</script>

<template>
  <div class="play" :class="{ 'play--on': active }">
    <div class="match">
      <FlagCircle code="br" :size="34" />
      <span class="score">
        <span class="num num--1">2</span>
        <span class="dash">–</span>
        <span class="num num--2">1</span>
      </span>
      <FlagCircle code="tr" :size="34" />
    </div>

    <div class="table">
      <div
        v-for="(row, i) in ROWS"
        :key="row.code"
        class="row"
        :class="{ 'row--lead': i === 0 }"
        :style="{ '--i': i, '--w': `${(row.pts / MAX) * 100}%` }"
      >
        <span class="rank">{{ i + 1 }}</span>
        <FlagCircle :code="row.code" :size="20" />
        <span class="abbr">{{ row.abbr }}</span>
        <span class="track"><span class="fill" /></span>
        <span class="pts">{{ row.pts }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.play {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--sp-4);
  height: 100%;
  padding: 0 var(--sp-4);
}

.match {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-4);
}

.score {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  font-family: var(--font);
  font-size: 30px;
  line-height: 1;
}
.dash {
  color: var(--text-muted);
}
.num {
  display: inline-block;
  opacity: 0;
  scale: 0.3;
}

.table {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.row {
  display: grid;
  grid-template-columns: 14px 20px 34px 1fr 16px;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-xs);
  opacity: 0;
  translate: 0 8px;
}
.rank {
  color: var(--text-muted);
  text-align: center;
}
.abbr {
  font-weight: 700;
  letter-spacing: 0.03em;
}
.pts {
  text-align: end;
  font-weight: 700;
}

.track {
  height: 6px;
  border-radius: 3px;
  background: var(--border-light);
  overflow: hidden;
}
.fill {
  display: block;
  height: 100%;
  width: 0;
  border-radius: 3px;
  background: var(--accent);
}
.row--lead .fill {
  background: var(--gold);
}
.row--lead .pts,
.row--lead .abbr {
  color: var(--gold-text);
}

.play--on .num {
  animation: pop 0.45s cubic-bezier(0.3, 1.5, 0.5, 1) forwards;
}
.play--on .num--1 {
  animation-delay: 0.3s;
}
.play--on .num--2 {
  animation-delay: 0.75s;
}
.play--on .row {
  animation: row-in 0.4s var(--ease) calc(1s + var(--i) * 0.1s) forwards;
}
.play--on .fill {
  animation: grow 0.7s var(--ease) calc(1.1s + var(--i) * 0.1s) forwards;
}

@keyframes pop {
  to {
    opacity: 1;
    scale: 1;
  }
}
@keyframes row-in {
  to {
    opacity: 1;
    translate: 0 0;
  }
}
@keyframes grow {
  to {
    width: var(--w);
  }
}

@media (prefers-reduced-motion: reduce) {
  .play--on .num,
  .play--on .row,
  .play--on .fill {
    animation-duration: 0.01s;
    animation-delay: 0s;
  }
}
</style>
