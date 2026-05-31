<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from "vue"
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from "chart.js"
import type { ChartData, ChartOptions } from "chart.js"
import type { League } from "../types"
import type { Team } from "@/modules/teams/types"
import { useLeagueProgress, type ProgressMode } from "../composables/useLeagueProgress"

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
)

const props = defineProps<{
  league: League
  teams: Team[]
  title?: string
}>()

const mode = ref<ProgressMode>("position")
const canvasRef = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

const { labels, datasets, hasData } = useLeagueProgress(
  () => props.league,
  () => props.teams,
  () => mode.value
)

const teamCount = computed(() => datasets.value.length)

function cssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

function getVisibilityMap(): Map<string, boolean> {
  const map = new Map<string, boolean>()
  if (!chart) return map
  chart.data.datasets.forEach((ds, i) => {
    if (ds.label) map.set(ds.label, !chart!.isDatasetVisible(i))
  })
  return map
}

function buildChartData(
  hiddenMap?: Map<string, boolean>
): ChartData<"line", (number | null)[], string> {
  return {
    labels: labels.value,
    datasets: datasets.value.map((ds, i) => ({
      label: ds.name,
      data: ds.data,
      borderColor: ds.color,
      backgroundColor: ds.color + "22",
      borderWidth: 2,
      pointRadius: labels.value.length > 20 ? 2 : 3,
      pointHoverRadius: 5,
      tension: 0.3,
      spanGaps: true,
      clip: false as const,
      hidden: hiddenMap ? (hiddenMap.get(ds.name) ?? i >= 2) : i >= 2,
    })),
  }
}

function buildChartOptions(): ChartOptions<"line"> {
  const isPosition = mode.value === "position"
  const maxPos = teamCount.value
  const textMuted = cssVar("--text-muted", "#888")
  const gridColor = cssVar("--border-light", "rgba(128,128,128,0.15)")

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 200 },
    layout: {
      padding: { top: 8, bottom: 8, left: 4, right: 4 },
    },
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          padding: 8,
          font: { size: 11 },
          color: textMuted,
        },
      },
      tooltip: {
        callbacks: {
          label: (item: { dataset: { label?: string }; raw: unknown }) =>
            isPosition
              ? ` ${item.dataset.label}: #${item.raw}`
              : ` ${item.dataset.label}: ${item.raw} pts`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          font: { size: 10 },
          color: textMuted,
          maxRotation: 45,
        },
        grid: { color: gridColor },
      },
      y: {
        reverse: isPosition,
        min: isPosition ? 0.5 : 0,
        max: isPosition ? maxPos + 0.5 : undefined,
        ticks: {
          stepSize: isPosition ? 1 : undefined,
          font: { size: 10 },
          color: textMuted,
          callback: (v: string | number) => (isPosition ? (Number.isInteger(v) ? `#${v}` : "") : v),
        },
        grid: { color: gridColor },
      },
    },
  }
}

function createChart() {
  if (!canvasRef.value || !hasData.value) return
  chart = new Chart(canvasRef.value, {
    type: "line",
    data: buildChartData(),
    options: buildChartOptions(),
  })
}

function updateChart() {
  if (!chart) return
  const hiddenMap = getVisibilityMap()
  const newData = buildChartData(hiddenMap)
  chart.data.labels = newData.labels
  chart.data.datasets = newData.datasets
  chart.options = buildChartOptions()
  chart.update()
}

onMounted(() => createChart())
onBeforeUnmount(() => {
  chart?.destroy()
  chart = null
})

watch([labels, datasets, mode], () => {
  if (!chart && canvasRef.value) createChart()
  else updateChart()
})
</script>

<template>
  <div v-if="hasData" class="progress-chart">
    <div class="chart-header">
      <span class="chart-title">{{ title ?? "Standings Progress" }}</span>
      <div class="mode-toggle">
        <button :class="{ active: mode === 'position' }" @click="mode = 'position'">
          Position
        </button>
        <button :class="{ active: mode === 'points' }" @click="mode = 'points'">Points</button>
      </div>
    </div>
    <div class="canvas-wrap">
      <canvas ref="canvasRef" />
    </div>
  </div>
</template>

<style scoped>
.progress-chart {
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--surface);
  overflow: visible;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius) var(--radius) 0 0;
}

.chart-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.mode-toggle {
  display: flex;
  gap: 2px;
}

.mode-toggle button {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 2px;
  border: 1px solid var(--border-light);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.mode-toggle button.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.canvas-wrap {
  padding: 12px;
  height: 320px;
}
</style>
