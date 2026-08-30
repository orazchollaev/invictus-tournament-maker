<script setup lang="ts">
/**
 * Identity strip for the player page: who he is, where he plays, how
 * strong he is. Mirrors TeamHeaderCard so the two detail pages read as
 * the same kind of screen.
 */
import { ArrowLeft } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { AppButton, AppCard, AppIcon } from "@/components/ui"
import PlayerAvatar from "../PlayerAvatar.vue"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import type { Player } from "@/modules/players/types"
import type { Team } from "@/modules/teams/types"

defineProps<{
  player: Player
  team: Team | undefined
}>()

defineEmits<{ back: [] }>()

const { t } = useI18n()
</script>

<template>
  <AppCard padding="md" rail class="player-header-card">
    <div class="header">
      <AppButton variant="text" size="xs" @click="$emit('back')">
        <AppIcon :icon="ArrowLeft" />
        {{ t("common.back") }}
      </AppButton>

      <div class="identity">
        <div class="avatar-wrap">
          <PlayerAvatar :name="player.name" :color="team?.color ?? '#999'" :size="48" />
          <span v-if="player.number" class="shirt">{{ player.number }}</span>
        </div>

        <div class="who">
          <h1 class="name">{{ player.name }}</h1>
          <div class="meta">
            <span class="pos">{{ t(`players.positions.${player.position}`) }}</span>
            <TeamBadge v-if="team" :team="team" :size="16" class="team" />
          </div>
        </div>

        <div class="power">
          <span class="power-value">{{ player.power }}</span>
          <span class="power-label">{{ t("players.form.power") }}</span>
        </div>
      </div>
    </div>
  </AppCard>
</template>

<style scoped>
/* --rail-color is set by the page from the team colour. */
.player-header-card {
  background: color-mix(in srgb, var(--rail-color, transparent) 5%, var(--surface));
}

.header {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  align-items: flex-start;
}

.identity {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  width: 100%;
  min-width: 0;
}

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

/* The shirt number rides the avatar rather than sitting in the metadata
   line — it is an identifier, not a statistic. */
.shirt {
  position: absolute;
  inset-block-end: -2px;
  inset-inline-end: -4px;
  min-width: 20px;
  padding: 0 4px;
  border-radius: var(--radius-pill);
  border: 2px solid var(--surface);
  background: var(--rail-color, var(--accent));
  color: #fff;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.35);
}

.who {
  min-width: 0;
  flex: 1;
}

.name {
  margin: 0;
  font-size: var(--fs-xl);
  font-weight: 600;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-top: 2px;
  min-width: 0;
}

.pos {
  padding: 1px var(--sp-2);
  border-radius: var(--radius-sm);
  background: var(--bg-hover);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--text-muted);
}

.team {
  font-size: var(--fs-sm);
  color: var(--text-muted);
  min-width: 0;
}

.power {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  padding-inline-start: var(--sp-3);
  border-inline-start: 1px solid var(--border-light);
}

.power-value {
  font-family: var(--font-mono);
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--rail-color, var(--accent));
}

.power-label {
  font-family: var(--font-ui);
  font-size: var(--fs-xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
</style>
