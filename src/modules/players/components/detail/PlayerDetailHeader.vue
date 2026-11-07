<script setup lang="ts">
/**
 * Top row of the player page, on the same AppPageHeader as every other
 * detail page: back · avatar · name over position, team and power · edit.
 */
import { Pencil } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { AppButton, AppIcon, AppPageHeader } from "@/components/ui"
import { PlayerAvatar } from "@/modules/players/components"
import { TeamBadge } from "@/modules/teams/components"
import type { Player } from "@/modules/players/types"
import type { Team } from "@/modules/teams/types"

defineProps<{
  player: Player
  team: Team | undefined
}>()

defineEmits<{ back: []; edit: [] }>()

const { t } = useI18n()
</script>

<template>
  <AppPageHeader :title="player.name" @back="$emit('back')">
    <template #lead>
      <span class="avatar-wrap">
        <PlayerAvatar
          :name="player.name"
          :color="team?.color ?? '#999'"
          :image="player.image"
          :face="player.face"
          :size="32"
        />
        <!-- The shirt number rides the avatar: an identifier, not a statistic. -->
        <span v-if="player.number" class="shirt">{{ player.number }}</span>
      </span>
    </template>

    <template #subtitle>
      <span class="pos">{{ t(`players.positions.${player.position}`) }}</span>
      <TeamBadge v-if="team" :team="team" :size="12" class="team" />
      <span class="sep">·</span>
      <span>
        {{ t("players.form.power") }}
        <strong class="power">{{ player.power }}</strong>
      </span>
    </template>

    <template #actions>
      <AppButton
        icon-only
        :title="t('players.form.editTitle')"
        :aria-label="t('players.form.editTitle')"
        @click="$emit('edit')"
      >
        <AppIcon :icon="Pencil" size="md" />
      </AppButton>
    </template>
  </AppPageHeader>
</template>

<style scoped>
.avatar-wrap {
  position: relative;
  display: flex;
}

.shirt {
  position: absolute;
  inset-block-end: -3px;
  inset-inline-end: -5px;
  min-width: 16px;
  padding: 0 3px;
  border-radius: var(--radius-pill);
  border: 2px solid var(--surface);
  background: var(--rail-color, var(--accent));
  color: #fff;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  line-height: 12px;
  text-align: center;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.35);
}

.pos {
  font-family: var(--font-mono);
  font-weight: 700;
}

.team {
  min-width: 0;
  overflow: hidden;
}

.power {
  color: var(--rail-color, var(--accent));
}
</style>
