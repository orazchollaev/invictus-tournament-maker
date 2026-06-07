<script setup lang="ts">
import { ref, computed } from "vue"
import { useI18n } from "vue-i18n"
import { X, Search } from "@lucide/vue"

interface Team {
  id: string
  name: string
  color: string
  power: number
}

interface Props {
  teams: Team[]
  selected: string[]
  showPower?: boolean
  disabled?: boolean
}

interface Emits {
  (e: "update:selected", ids: string[]): void
}

const props = withDefaults(defineProps<Props>(), {
  showPower: true,
  disabled: false,
})

const emit = defineEmits<Emits>()
const { t } = useI18n()

const searchQuery = ref("")

const selectedTeams = computed(() => props.teams.filter((t) => props.selected.includes(t.id)))

const availableTeams = computed(() => {
  const available = props.teams.filter((t) => !props.selected.includes(t.id))
  if (!searchQuery.value.trim()) return available
  const q = searchQuery.value.toLowerCase()
  return available.filter((t) => t.name.toLowerCase().includes(q))
})

function toggleTeam(teamId: string) {
  if (props.disabled) return
  if (props.selected.includes(teamId)) {
    emit(
      "update:selected",
      props.selected.filter((id) => id !== teamId)
    )
  } else {
    emit("update:selected", [...props.selected, teamId])
  }
}

function removeTeam(teamId: string) {
  if (props.disabled) return
  emit(
    "update:selected",
    props.selected.filter((id) => id !== teamId)
  )
}

function selectAll() {
  if (props.disabled) return
  emit(
    "update:selected",
    props.teams.map((t) => t.id)
  )
}

function deselectAll() {
  if (props.disabled) return
  emit("update:selected", [])
}
</script>

<template>
  <div class="ts">
    <div class="ts-top-row">
      <div class="ts-search-wrap">
        <Search :size="14" class="ts-search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          class="ts-search"
          :disabled="disabled"
          :placeholder="t('teamSelector.searchPlaceholder')"
        />
      </div>
      <div class="ts-top-btns">
        <button class="ts-action" :disabled="disabled" @click="selectAll">
          {{ t("teamSelector.selectAll") }}
        </button>
        <button class="ts-action ts-action--danger" :disabled="disabled" @click="deselectAll">
          {{ t("teamSelector.deselectAll") }}
        </button>
      </div>
    </div>

    <div class="ts-grid">
      <div class="ts-col">
        <div class="ts-col-head">
          <span class="ts-col-title">{{ t("teamSelector.selected") }}</span>
          <span class="ts-badge">{{ selectedTeams.length }}</span>
        </div>
        <div class="ts-list">
          <div v-for="team in selectedTeams" :key="team.id" class="ts-item ts-item--on">
            <span class="ts-dot" :style="{ background: team.color }" />
            <span class="ts-name">{{ team.name }}</span>
            <span v-if="showPower" class="ts-power">{{ team.power }}</span>
            <button class="ts-rm" :disabled="disabled" @click="removeTeam(team.id)">
              <X :size="12" />
            </button>
          </div>
          <div v-if="!selectedTeams.length" class="ts-empty">
            {{ t("teamSelector.emptySelected") }}
          </div>
        </div>
      </div>

      <div class="ts-col">
        <div class="ts-col-head">
          <span class="ts-col-title">{{ t("teamSelector.available") }}</span>
          <span class="ts-badge">{{ availableTeams.length }}</span>
        </div>
        <div class="ts-list">
          <div
            v-for="team in availableTeams"
            :key="team.id"
            class="ts-item"
            :class="{ 'ts-item--disabled': disabled }"
            @click="toggleTeam(team.id)"
          >
            <span class="ts-dot" :style="{ background: team.color }" />
            <span class="ts-name">{{ team.name }}</span>
            <span v-if="showPower" class="ts-power">{{ team.power }}</span>
          </div>
          <div v-if="!availableTeams.length" class="ts-empty">
            {{ t("teamSelector.emptyAvailable") }}
          </div>
        </div>
      </div>
    </div>

    <p v-if="selected.length < 2" class="ts-warn">{{ t("teamSelector.minTeams") }}</p>
  </div>
</template>

<style scoped>
.ts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ts-top-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ts-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
}

.ts-top-btns {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.ts-search-icon {
  position: absolute;
  left: 9px;
  color: var(--text-muted);
  pointer-events: none;
}

.ts-search {
  width: 100%;
  padding: 7px 10px 7px 28px;
  font-size: 13px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  font-family: var(--font-ui);
  transition: border-color 0.15s;
}

.ts-search:focus {
  outline: none;
  border-color: var(--accent);
}

.ts-search:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ts-search::placeholder {
  color: var(--text-muted);
}

.ts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.ts-col {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  background: var(--surface);
  overflow: hidden;
}

.ts-col-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
}

.ts-col-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  font-family: var(--font-ui);
}

.ts-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
  padding: 0 5px;
  border-radius: 3px;
  line-height: 1.7;
}

.ts-list {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px;
  height: 220px;
}

.ts-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 8px;
  border: 1px solid var(--border-light);
  border-left: 2px solid transparent;
  border-radius: 4px;
  background: var(--bg);
  cursor: pointer;
  transition:
    border-color 0.12s,
    background 0.12s;
  user-select: none;
}

.ts-item:hover {
  border-color: var(--border);
  border-left-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 4%, var(--bg));
}

.ts-item--on {
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  border-left-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--bg));
}

.ts-item--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ts-item--disabled:hover {
  border-color: var(--border-light);
  border-left-color: transparent;
  background: var(--bg);
}

.ts-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ts-name {
  flex: 1;
  font-size: 12px;
  color: var(--text);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ts-power {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
  flex-shrink: 0;
}

.ts-rm {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 3px;
  transition:
    color 0.12s,
    background 0.12s;
  flex-shrink: 0;
}

.ts-rm:hover {
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 10%, transparent);
}

.ts-rm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ts-empty {
  padding: 16px 8px;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
}

.ts-action {
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  font-family: var(--font-ui);
  white-space: nowrap;
  transition:
    border-color 0.12s,
    color 0.12s;
}

.ts-action:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.ts-action--danger:hover {
  border-color: var(--danger);
  color: var(--danger);
}

.ts-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ts-warn {
  font-size: 11px;
  font-weight: 500;
  color: var(--danger);
  margin: 0;
}

@media (max-width: 640px) {
  .ts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
