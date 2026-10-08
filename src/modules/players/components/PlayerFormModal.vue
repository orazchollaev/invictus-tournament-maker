<script setup lang="ts">
import { ref, computed, nextTick } from "vue"
import { AppButton, AppField, AppIcon, AppModal, AppSelect } from "@/components/ui"
import PlayerAvatar from "./PlayerAvatar.vue"
import TeamSelect from "./TeamSelect.vue"
import NumberPickerModal from "./NumberPickerModal.vue"
import TeamImageSourceModal from "@/modules/teams/components/TeamImageSourceModal.vue"
import PlayerFaceModal from "./PlayerFaceModal.vue"
import TeamImageUrlModal from "@/modules/teams/components/TeamImageUrlModal.vue"
import { resizeImageFile } from "@/modules/teams/utils/imageUtils"
import { showAlert } from "@/composables/useDialog"
import { usePlayersStore } from "../store"
import { useTeamsStore } from "@/modules/teams/store"
import { useModal } from "@/composables/useModal"
import { randomPlayerName } from "@/composables/useRandomNames"
import { randomFace, type FaceConfig } from "@/lib/faces"
import { Pencil, Shuffle, X } from "@lucide/vue"
import type { Player, PlayerPosition } from "../types"
import { useI18n } from "vue-i18n"
import { logEvent } from "@/composables/useAnalytics"

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
const image = ref<string | undefined>(props.player?.image)
// A new player starts with a random face; an existing one keeps what he has.
const face = ref<FaceConfig | undefined>(props.player ? props.player.face : randomFace())
const showFaceModal = ref(false)
const showSourceChooser = ref(false)
const showUrlModal = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
function onChooseUrl() {
  showSourceChooser.value = false
  showUrlModal.value = true
}
function onChooseFace() {
  showSourceChooser.value = false
  showFaceModal.value = true
}
function onFaceSave(f: FaceConfig) {
  face.value = f
  // The drawn face shows only without a photo, so choosing it drops the photo.
  image.value = undefined
}
function onUrlSelect(url: string) {
  image.value = url
  showUrlModal.value = false
}
function onGallerySelect() {
  showSourceChooser.value = false
  nextTick(() => fileInput.value?.click())
}
async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ""
  if (!file) return
  try {
    image.value = await resizeImageFile(file)
  } catch {
    showAlert(t("teams.form.imageInvalid"))
  }
}

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
      image: image.value,
      face: face.value,
    })
  } else {
    store.add(
      teamId.value,
      name.value.trim(),
      position.value,
      power.value,
      shirtNumber.value ?? undefined,
      image.value,
      face.value
    )
    void logEvent("player_created", { position: position.value })
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
        <!-- Tap the avatar to add a photo from the gallery or a URL. -->
        <div class="avatar-pick" @click="showSourceChooser = true">
          <PlayerAvatar
            :name="name"
            :color="selectedTeam?.color ?? '#999'"
            :number="shirtNumber"
            :image="image"
            :face="face"
            :size="52"
          />
          <button
            v-if="image"
            type="button"
            class="avatar-clear"
            :title="t('teams.form.imageRemove')"
            @click.stop="image = undefined"
          >
            <AppIcon :icon="X" size="xs" />
          </button>
          <span class="avatar-edit" aria-hidden="true">
            <AppIcon :icon="Pencil" size="xs" />
          </span>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="visually-hidden"
          @change="onFileChange"
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
  <TeamImageSourceModal
    v-if="showSourceChooser"
    hide-flag
    show-face
    @close="showSourceChooser = false"
    @select-url="onChooseUrl"
    @select-gallery="onGallerySelect"
    @select-face="onChooseFace"
  />
  <PlayerFaceModal
    v-if="showFaceModal"
    :face="face"
    @close="showFaceModal = false"
    @save="onFaceSave"
  />
  <TeamImageUrlModal
    v-if="showUrlModal"
    @close="showUrlModal = false"
    @update:model-value="onUrlSelect"
  />
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

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.avatar-pick {
  position: relative;
  flex-shrink: 0;
  cursor: pointer;
}
.avatar-clear,
.avatar-edit {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: var(--elev-1);
}
.avatar-clear {
  top: -5px;
  right: -5px;
  width: 18px;
  height: 18px;
  padding: 0;
  color: var(--text-muted);
  cursor: pointer;
}
.avatar-clear:hover {
  color: var(--danger);
  border-color: var(--danger);
}
.avatar-edit {
  right: -5px;
  bottom: -5px;
  width: 20px;
  height: 20px;
  color: var(--text);
  pointer-events: none;
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
