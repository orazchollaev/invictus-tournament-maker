<script setup lang="ts">
/**
 * Headless. Mounted once in App.vue, beside AppDialog, so the music survives
 * every navigation — the audio element itself lives in the composable, not in
 * this template, and this exists only to own its lifetime.
 */
import { onMounted, onUnmounted } from "vue"
import { useMusicPlayer } from "../composables/useMusicPlayer"

const player = useMusicPlayer()

onMounted(player.init)
onUnmounted(player.dispose)
</script>

<template><span /></template>
