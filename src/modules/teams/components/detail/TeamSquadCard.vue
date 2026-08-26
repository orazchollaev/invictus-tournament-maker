<script setup lang="ts">
/** Compact roster card for TeamDetailPage — lists this team's players with
 * inline add/edit/remove, reusing the players module's own store/modal. */
import { ref, computed } from "vue"
import { useI18n } from "vue-i18n"
import { AppButton, AppChip, AppIcon, AppSectionHeader } from "@/components/ui"
import { Pencil, Plus, X } from "@lucide/vue"
import { usePlayersStore } from "@/modules/players/store"
import PlayerAvatar from "@/modules/players/components/PlayerAvatar.vue"
import PlayerFormModal from "@/modules/players/components/PlayerFormModal.vue"
import type { Player } from "@/modules/players/types"

const props = defineProps<{ teamId: string; teamColor: string }>()

const { t } = useI18n()
const playersStore = usePlayersStore()

const squad = computed(() => playersStore.byTeam(props.teamId))

const showAddModal = ref(false)
const editingPlayer = ref<Player | null>(null)
</script>

<template>
  <div class="section">
    <AppSectionHeader :title="t('players.squadTitle')">
      <template #actions>
        <span class="count">{{ squad.length }}</span>
        <AppButton variant="text" size="xs" @click="showAddModal = true">
          <AppIcon :icon="Plus" size="xs" />
          {{ t("players.addBtn") }}
        </AppButton>
      </template>
    </AppSectionHeader>

    <div v-if="squad.length" class="squad-list">
      <div v-for="p in squad" :key="p.id" class="squad-row">
        <PlayerAvatar :name="p.name" :color="teamColor" :number="p.number" :size="24" />
        <RouterLink :to="`/players/${p.id}`" class="squad-name">{{ p.name }}</RouterLink>
        <AppChip
          square
          size="xs"
          class="squad-position"
          :title="t(`players.positions.${p.position}`)"
        >
          {{ p.position }}
        </AppChip>
        <AppChip square size="xs" class="squad-power">{{ p.power }}</AppChip>
        <div class="squad-actions">
          <AppButton
            variant="text"
            icon-only
            size="xs"
            :title="t('common.edit')"
            @click="editingPlayer = p"
          >
            <AppIcon :icon="Pencil" size="xs" />
          </AppButton>
          <AppButton
            variant="danger"
            icon-only
            size="xs"
            :title="t('common.delete')"
            @click="playersStore.remove(p.id)"
          >
            <AppIcon :icon="X" size="xs" />
          </AppButton>
        </div>
      </div>
    </div>
    <p v-else class="empty-inline">{{ t("players.emptyOnTeam") }}</p>

    <PlayerFormModal v-if="showAddModal" :team-id="teamId" @close="showAddModal = false" />
    <PlayerFormModal v-if="editingPlayer" :player="editingPlayer" @close="editingPlayer = null" />
  </div>
</template>

<style scoped>
.count {
  font-size: var(--fs-xs);
  font-weight: 400;
  text-transform: none;
  letter-spacing: normal;
  color: var(--text-muted);
}

.squad-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border-bottom: 1px solid var(--border-light);
}
.squad-row:last-child {
  border-bottom: none;
}

.squad-name {
  flex: 1;
  min-width: 0;
  font-size: var(--fs-base);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: inherit;
  text-decoration: none;
}
.squad-name:hover {
  color: var(--accent);
}

.squad-position {
  min-width: 30px;
  justify-content: center;
  flex-shrink: 0;
}

.squad-power {
  min-width: 26px;
  justify-content: center;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.squad-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  flex-shrink: 0;
}
</style>
