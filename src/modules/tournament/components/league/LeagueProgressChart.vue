<script setup lang="ts">
import { useI18n } from "vue-i18n"
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
import type { League } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import {
  useLeagueProgress,
  type ProgressMode,
} from "@/modules/tournament/composables/useLeagueProgress"
import { AppCard } from "@/components/ui"

const props = defineProps<{
  league: League
  teams: Team[]
  title?: string
}>()

const { t } = useI18n()

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
)

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

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1]!, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * Team colours often collide (two red kits in one group). A line whose colour
 * is close to an earlier one gets a dash pattern and point shape so the two
 * stay tell-apart-able.
 */
const DASHES = [[], [6, 4], [2, 3], [10, 3, 2, 3]]
const POINT_STYLES = ["circle", "rectRot", "triangle", "rect"] as const

function lineStyles(colors: string[]): number[] {
  const rgbs = colors.map(hexToRgb)
  return rgbs.map((rgb, i) => {
    if (!rgb) return 0
    let clashes = 0
    for (let j = 0; j < i; j++) {
      const other = rgbs[j]
      if (!other) continue
      const d = Math.hypot(rgb[0] - other[0], rgb[1] - other[1], rgb[2] - other[2])
      if (d < 90) clashes++
    }
    return clashes % DASHES.length
  })
}

function buildChartData(
  hiddenMap?: Map<string, boolean>
): ChartData<"line", (number | null)[], string> {
  const styles = lineStyles(datasets.value.map((ds) => ds.color))
  return {
    labels: labels.value,
    datasets: datasets.value.map((ds, i) => ({
      label: ds.name,
      data: ds.data,
      borderColor: ds.color,
      backgroundColor: ds.color,
      borderWidth: 2,
      borderDash: DASHES[styles[i]!],
      pointStyle: POINT_STYLES[styles[i]!],
      pointRadius: labels.value.length > 20 ? 2 : 3,
      pointHoverRadius: 5,
      tension: 0,
      spanGaps: true,
      clip: false as const,
      hidden: hiddenMap ? (hiddenMap.get(ds.name) ?? i >= 4) : i >= 4,
    })),
  }
}

function buildChartOptions(): ChartOptions<"line"> {
  const isPosition = mode.value === "position"
  const maxPos = teamCount.value
  const textMuted = cssVar("--text-muted", "#888")
  const gridColor = cssVar("--border-light", "rgba(128,128,128,0.15)")
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 640

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 200 },
    layout: {
      padding: { top: 8, bottom: 8, left: 4, right: 8 },
    },
    plugins: {
      legend: {
        position: isMobile ? ("bottom" as const) : ("right" as const),
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
          padding: isMobile ? 6 : 8,
          font: { size: 10 },
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
        // Integer bounds so every tick lands on a rank (0.5 offsets left every label blank).
        min: isPosition ? 1 : 0,
        max: isPosition ? maxPos : undefined,
        grace: isPosition ? 0 : "5%",
        ticks: {
          stepSize: isPosition ? 1 : undefined,
          precision: 0,
          font: { size: 10 },
          color: textMuted,
          callback: (v: string | number) => (isPosition ? `#${v}` : v),
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
  <AppCard v-if="hasData" variant="outlined" :title="title ?? t('progressChart.title')">
    <div class="chart-header">
      <div class="mode-toggle">
        <button :class="{ active: mode === 'position' }" @click="mode = 'position'">
          {{ t("progressChart.position") }}
        </button>
        <button :class="{ active: mode === 'points' }" @click="mode = 'points'">
          {{ t("progressChart.points") }}
        </button>
      </div>
    </div>
    <div class="canvas-wrap">
      <canvas ref="canvasRef" />
    </div>
  </AppCard>
</template>

<style scoped>
.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-1) var(--sp-2);
  background: var(--bg);
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
  border-radius: var(--radius);
  border: 1px solid var(--border-light);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.mode-toggle button.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--on-accent);
}

.canvas-wrap {
  padding: 12px;
  height: 320px;
}

@media (max-width: 600px) {
  .canvas-wrap {
    height: 260px;
    padding: 8px;
  }
}
</style>
