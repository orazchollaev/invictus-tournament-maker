<script setup lang="ts">
import type { StoredAnnouncement } from "../services/adminApi"
import { statusOf, type AnnouncementStatus } from "../utils/form"

defineProps<{
  rows: StoredAnnouncement[]
  selectedId: string | null
  busyId: string | null
}>()

defineEmits<{
  select: [id: string]
  toggle: [row: StoredAnnouncement]
  duplicate: [row: StoredAnnouncement]
  remove: [row: StoredAnnouncement]
}>()

const STATUS_LABEL: Record<AnnouncementStatus, string> = {
  live: "Yayında",
  scheduled: "Planlandı",
  ended: "Bitti",
  disabled: "Kapalı",
}

const dateFmt = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" })
</script>

<template>
  <ul class="list">
    <li
      v-for="row in rows"
      :key="row.id"
      class="row"
      :class="{ selected: row.id === selectedId }"
      @click="$emit('select', row.id)"
    >
      <div class="row-head">
        <span class="row-id">{{ row.id }}</span>
        <span v-if="row.announcement" class="status" :data-status="statusOf(row.announcement)">
          {{ STATUS_LABEL[statusOf(row.announcement)] }}
        </span>
        <span v-else class="status" data-status="invalid">Geçersiz</span>
      </div>

      <template v-if="row.announcement">
        <div class="row-title">
          {{ (row.announcement.content.tr ?? Object.values(row.announcement.content)[0])?.title }}
        </div>
        <div class="row-meta">
          {{ dateFmt.format(row.announcement.startAt) }} →
          {{ dateFmt.format(row.announcement.endAt) }}
        </div>
        <div class="row-meta">
          {{ Object.keys(row.announcement.content).join(", ") }}
        </div>
      </template>
      <div v-else class="row-errors">Uygulama bunu atlıyor: {{ row.errors.join("; ") }}</div>

      <div class="row-actions" @click.stop>
        <button
          v-if="row.announcement"
          class="btn-xs"
          :disabled="busyId === row.id"
          @click="$emit('toggle', row)"
        >
          {{ row.announcement.enabled ? "Kapat" : "Aç" }}
        </button>
        <button
          v-if="row.announcement"
          class="btn-xs"
          :disabled="busyId === row.id"
          @click="$emit('duplicate', row)"
        >
          Kopyala
        </button>
        <button class="btn-xs danger" :disabled="busyId === row.id" @click="$emit('remove', row)">
          Sil
        </button>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.row {
  padding: var(--sp-3);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--surface);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.row:hover {
  border-color: var(--border);
}

.row.selected {
  border-color: var(--accent);
  box-shadow: var(--focus-ring);
}

.row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
}

.row-id {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status {
  font-size: var(--fs-xs);
  font-weight: 700;
  padding: 2px var(--sp-2);
  border-radius: var(--radius-pill);
  background: var(--fill-1);
  color: var(--text-muted);
  white-space: nowrap;
}

.status[data-status="live"] {
  background: color-mix(in srgb, var(--live) 18%, transparent);
  color: var(--success);
}

.status[data-status="scheduled"] {
  background: color-mix(in srgb, var(--warning) 18%, transparent);
  color: var(--warning);
}

.status[data-status="invalid"] {
  background: color-mix(in srgb, var(--danger) 15%, transparent);
  color: var(--danger);
}

.row-title {
  font-weight: 600;
}

.row-meta {
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.row-errors {
  font-size: var(--fs-xs);
  color: var(--danger);
}

.row-actions {
  display: flex;
  gap: var(--sp-1);
  margin-top: var(--sp-1);
}
</style>
