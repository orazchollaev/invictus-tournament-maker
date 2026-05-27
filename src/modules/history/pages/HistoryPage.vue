<script setup lang="ts">
import { computed } from "vue"
import { useRouter } from "vue-router"
import { useTournamentStore } from "@/modules/tournament/store"
import { ChevronRight } from "lucide-vue-next"

const router = useRouter()
const store = useTournamentStore()

interface SeriesEntry {
  name: string
  seasons: number
  latestSeason: number
  teamCount: number
  format: string
  champId: string | null
}

const series = computed<SeriesEntry[]>(() => {
  const map = new Map<string, SeriesEntry>()
  for (const t of store.tournaments) {
    const finished = store.isTournamentFinished(t.id)
    const existing = map.get(t.name)
    if (!existing) {
      map.set(t.name, {
        name: t.name,
        seasons: 1,
        latestSeason: t.season,
        teamCount: t.teamIds.length,
        format: t.format,
        champId: finished ? t.winnerId : null,
      })
    } else {
      existing.seasons++
      if (t.season > existing.latestSeason) {
        existing.latestSeason = t.season
        existing.teamCount = t.teamIds.length
        existing.format = t.format
      }
      if (finished) existing.champId = t.winnerId
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
})
</script>

<template>
  <div class="page">
    <div class="page-top">
      <h2 class="page-title">History</h2>
    </div>

    <p v-if="!series.length" class="empty-text">No tournaments yet.</p>

    <div v-else class="t-list">
      <div v-for="s in series" :key="s.name" class="t-row">
        <div class="t-body">
          <div class="t-top">
            <span class="t-name">{{ s.name }}</span>
          </div>
          <div class="t-meta-row">
            <span class="t-badge">
              {{ s.seasons }} {{ s.seasons === 1 ? "season" : "seasons" }}
            </span>
            <span class="t-badge accent">
              {{ s.format === "group+bracket" ? "Groups+KO" : "Bracket" }}
            </span>
            <span class="t-dot">{{ s.teamCount }} teams</span>
          </div>
        </div>
        <div class="t-actions">
          <button
            class="sm icon-btn"
            @click.stop="router.push('/history/' + encodeURIComponent(s.name))"
          >
            <ChevronRight :size="14" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.t-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.t-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  min-width: 0;
}
.t-body {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
  min-width: 0;
}

.t-top {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.t-name {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.t-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.t-badge {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: 4px;
  padding: 1px 6px;
  line-height: 1.6;
  font-family: var(--font-ui);
}
.t-badge.accent {
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border-color: color-mix(in srgb, var(--accent) 25%, transparent);
}
.t-dot {
  font-size: 11px;
  color: var(--text-muted);
}
.t-dot::before {
  content: "·";
  margin-right: 6px;
  opacity: 0.5;
}

.winner-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: 4px;
  padding: 2px 7px 2px 5px;
  line-height: 1.6;
  flex-shrink: 0;
}
.winner-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--team-color, #888);
  flex-shrink: 0;
}

.t-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.icon-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-text {
  color: var(--text-muted);
  font-size: 13px;
}

@media (max-width: 600px) {
  .t-row {
    flex-wrap: wrap;
    row-gap: 8px;
    padding: 10px 12px;
  }
  .t-body {
    flex: 1 1 100%;
  }
  .t-actions {
    flex: 1 1 100%;
  }
}
</style>
