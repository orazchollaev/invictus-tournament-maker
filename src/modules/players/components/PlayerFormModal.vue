<script setup lang="ts">
import { ref, computed } from "vue"
import { AppButton, AppField, AppIcon, AppModal, AppSelect } from "@/components/ui"
import PlayerAvatar from "./PlayerAvatar.vue"
import TeamSelect from "./TeamSelect.vue"
import NumberPickerModal from "./NumberPickerModal.vue"
import { usePlayersStore } from "../store"
import { useTeamsStore } from "@/modules/teams/store"
import { useModal } from "@/composables/useModal"
import { randomPlayerName } from "@/composables/useRandomNames"
import { Shuffle } from "@lucide/vue"
import type { Player, PlayerPosition } from "../types"
import { useI18n } from "vue-i18n"

const props = defineProps<{ player?: Player; teamId?: string }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const store = usePlayersStore()
const teamsStore = useTeamsStore()
useModal(() => modal.value?.close())

const modal = ref<InstanceType<typeof AppModal> | null>(null)
const isEdit = !!props.player

const name = ref(props.player?.name ?? "")
const teamId = ref(props.player?.teamId ?? props.teamId ?? teamsStore.teams[0]?.id ?? "")
const position = ref<PlayerPosition>(props.player?.position ?? "MID")
const power = ref(props.player?.power ?? 70)
const shirtNumber = ref<number | null>(props.player?.number ?? null)

const positionOptions = computed(() => [
  { value: "GK" as const, label: t("players.positions.GK") },
  { value: "DEF" as const, label: t("players.positions.DEF") },
  { value: "MID" as const, label: t("players.positions.MID") },
  { value: "FWD" as const, label: t("players.positions.FWD") },
])

const selectedTeam = computed(() => teamsStore.teams.find((tm) => tm.id === teamId.value))

function submit() {
  if (!name.value.trim() || !teamId.value) return
  if (isEdit && props.player) {
    store.update(props.player.id, {
      name: name.value.trim(),
      teamId: teamId.value,
      position: position.value,
      power: power.value,
      number: shirtNumber.value ?? undefined,
    })
  } else {
    store.add(
      teamId.value,
      name.value.trim(),
      position.value,
      power.value,
      shirtNumber.value ?? undefined
    )
  }
  modal.value?.close()
}
</script>

<template>
  <AppModal
    ref="modal"
    :title="isEdit ? t('players.form.editTitle') : t('players.form.addTitle')"
    @close="emit('close')"
  >
    <div
      class="form"
      :style="{
        '--player-color': selectedTeam?.color ?? '#999',
        '--power-color': selectedTeam?.color ?? '#999',
      }"
    >
      <div class="preview">
        <PlayerAvatar
          :name="name"
          :color="selectedTeam?.color ?? '#999'"
          :number="shirtNumber"
          :size="52"
        />
        <div class="preview-text">
          <p class="preview-name" :class="{ 'preview-name--empty': !name.trim() }">
            {{ name.trim() || t("players.form.namePlaceholder") }}
          </p>
          <p class="preview-meta">
            {{ t("players.form.power") }}
            <strong>{{ power }}</strong>
          </p>
        </div>
      </div>

      <div class="section">
        <AppField layout="stack" :label="t('players.form.name')">
          <div class="input-wrap">
            <input
              v-model="name"
              class="input-full"
              :placeholder="t('players.form.namePlaceholder')"
              autofocus
              @keyup.enter="submit"
            />
            <AppButton
              variant="text"
              size="xs"
              icon-only
              class="btn-random"
              :title="t('players.form.randomName')"
              @click="name = randomPlayerName()"
            >
              <AppIcon :icon="Shuffle" />
            </AppButton>
          </div>
        </AppField>

        <AppField layout="stack" :label="t('players.form.team')">
          <TeamSelect
            v-model="teamId"
            :teams="teamsStore.teams"
            :placeholder="t('players.form.teamPlaceholder')"
          />
        </AppField>

        <div class="row-split">
          <AppField layout="stack" :label="t('players.form.position')">
            <AppSelect v-model="position" :options="positionOptions" />
          </AppField>

          <AppField layout="stack" :label="t('players.form.number')">
            <NumberPickerModal
              v-model="shirtNumber"
              :placeholder="t('players.form.numberPlaceholder')"
            />
          </AppField>
        </div>
      </div>

      <div class="section">
        <AppField layout="stack">
          <template #label>
            <span class="label-row">
              {{ t("players.form.power") }}
              <span class="power-value">{{ power }}</span>
            </span>
          </template>
          <input
            v-model.number="power"
            class="power-slider"
            type="range"
            min="1"
            max="99"
            step="1"
            :style="{ '--pct': `${((power - 1) / 98) * 100}%` }"
            :aria-label="t('players.form.power')"
          />
        </AppField>
      </div>
    </div>

    <template #footer>
      <AppButton variant="filled" :disabled="!name.trim() || !teamId" @click="submit">
        {{ isEdit ? t("common.save") : t("players.form.addTitle") }}
      </AppButton>
      <AppButton @click="modal?.close()">{{ t("common.cancel") }}</AppButton>
    </template>
  </AppModal>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  min-width: 0;
  max-width: 100%;
}

/* ── Live preview ─────────────────────────────────────────────── */
.preview {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  background: color-mix(in srgb, var(--player-color) 8%, var(--surface));
  min-width: 0;
}

.preview-text {
  min-width: 0;
}

.preview-name {
  margin: 0;
  font-family: var(--font);
  font-size: var(--fs-lg);
  font-weight: 600;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preview-name--empty {
  color: var(--text-muted);
  font-weight: 400;
}

.preview-meta {
  margin: 2px 0 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
.preview-meta strong {
  font-family: var(--font-mono);
  color: var(--text);
}

/* ── Sections ─────────────────────────────────────────────────── */
.section {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding-top: var(--sp-4);
  border-top: 1px solid var(--border-light);
}

.label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-2);
}

/* Position and shirt number are both short — one row instead of two. */
.row-split {
  display: grid;
  grid-template-columns: 1fr 92px;
  gap: var(--sp-3);
  align-items: start;
}

/* ── Inputs ────────────────────────────────────────────────────── */
.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.input-full {
  width: 100%;
  padding-inline-end: var(--sp-6);
}

.btn-random {
  position: absolute;
  right: var(--sp-1);
}

/* ── Power slider ─────────────────────────────────────────────── */
.power-value {
  font-family: var(--font-mono);
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--player-color);
  text-shadow: 0 0 1px color-mix(in srgb, var(--text) 25%, transparent);
}
</style>
