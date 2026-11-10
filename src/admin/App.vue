<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue"
import type { User } from "firebase/auth"
import { ADMIN_EMAIL } from "./constants"
import { AnnouncementEditor, AnnouncementList } from "./components"
import {
  deleteAnnouncement,
  listAnnouncements,
  setEnabled,
  signIn,
  signOut,
  watchAdmin,
  type StoredAnnouncement,
} from "./services/adminApi"
import { emptyForm, formFromAnnouncement, type AnnouncementForm } from "./utils/form"

const user = ref<User | null>(null)
const authReady = ref(false)
const rejected = ref<string | null>(null)

const rows = ref<StoredAnnouncement[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const busyId = ref<string | null>(null)

/** What the editor is showing; `key` remounts it whenever a different one opens. */
const editing = ref<{ key: number; form: AnnouncementForm; existing: boolean } | null>(null)
let editKey = 0

function message(e: unknown) {
  return e instanceof Error ? e.message : String(e)
}

async function refresh() {
  loading.value = true
  error.value = null
  try {
    rows.value = await listAnnouncements()
  } catch (e) {
    error.value = message(e)
  } finally {
    loading.value = false
  }
}

let stop: (() => void) | undefined
onMounted(() => {
  stop = watchAdmin((u, rejectedEmail) => {
    user.value = u
    rejected.value = rejectedEmail
    authReady.value = true
    if (u) void refresh()
    else {
      rows.value = []
      editing.value = null
    }
  })
})
onUnmounted(() => stop?.())

async function login() {
  rejected.value = null
  error.value = null
  try {
    await signIn()
  } catch (e) {
    // Closing the popup is not an error worth showing.
    if (!message(e).includes("popup-closed")) error.value = message(e)
  }
}

function open(form: AnnouncementForm, existing: boolean) {
  editing.value = { key: ++editKey, form, existing }
}

function select(id: string) {
  const row = rows.value.find((r) => r.id === id)
  if (row?.announcement) open(formFromAnnouncement(row.announcement), true)
}

function duplicate(row: StoredAnnouncement) {
  if (!row.announcement) return
  open({ ...formFromAnnouncement(row.announcement), id: `${row.id}-2` }, false)
}

async function run(id: string, action: () => Promise<void>) {
  busyId.value = id
  error.value = null
  try {
    await action()
    await refresh()
    // The open editor would otherwise save its stale copy back over the change.
    if (editing.value?.existing && editing.value.form.id === id) select(id)
  } catch (e) {
    error.value = message(e)
  } finally {
    busyId.value = null
  }
}

function toggle(row: StoredAnnouncement) {
  if (row.announcement) void run(row.id, () => setEnabled(row.id, !row.announcement!.enabled))
}

function remove(row: StoredAnnouncement) {
  if (!confirm(`"${row.id}" kalıcı olarak silinsin mi?`)) return
  if (editing.value?.form.id === row.id) editing.value = null
  void run(row.id, () => deleteAnnouncement(row.id))
}

async function onSaved(id: string) {
  await refresh()
  select(id)
}
</script>

<template>
  <div v-if="!authReady" class="center muted">Yükleniyor…</div>

  <div v-else-if="!user" class="center">
    <div class="login form-card">
      <h1>Duyurular</h1>
      <p class="muted">Sadece {{ ADMIN_EMAIL }} giriş yapabilir.</p>
      <p v-if="rejected" class="err">{{ rejected }} bu panele giremez.</p>
      <p v-if="error" class="err">{{ error }}</p>
      <button class="primary" @click="login">Google ile giriş yap</button>
    </div>
  </div>

  <div v-else class="shell">
    <header class="top">
      <h1>Duyurular</h1>
      <div class="top-right">
        <span class="muted">{{ user.email }}</span>
        <button @click="signOut">Çıkış</button>
      </div>
    </header>

    <div class="body">
      <aside class="sidebar">
        <div class="sidebar-actions">
          <button class="primary" @click="open(emptyForm(), false)">+ Yeni duyuru</button>
          <button :disabled="loading" @click="refresh">Yenile</button>
        </div>
        <p v-if="error" class="err">{{ error }}</p>
        <p v-if="loading && !rows.length" class="muted">Yükleniyor…</p>
        <p v-else-if="!rows.length" class="muted">Henüz duyuru yok.</p>
        <AnnouncementList
          :rows="rows"
          :selected-id="editing?.existing ? editing.form.id : null"
          :busy-id="busyId"
          @select="select"
          @toggle="toggle"
          @duplicate="duplicate"
          @remove="remove"
        />
      </aside>

      <main class="main">
        <AnnouncementEditor
          v-if="editing"
          :key="editing.key"
          :initial="editing.form"
          :existing="editing.existing"
          @saved="onSaved"
          @cancel="editing = null"
        />
        <div v-else class="center muted">
          Düzenlemek için soldan bir duyuru seç ya da yeni bir tane oluştur.
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
h1 {
  margin: 0;
  font-size: var(--fs-xl);
}

.center {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
}

.login {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-6);
  min-width: 340px;
}

.err {
  color: var(--danger);
  font-size: var(--fs-sm);
  margin: 0;
}

.shell {
  max-width: 1440px;
  margin: 0 auto;
  padding: var(--sp-4) var(--sp-5);
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--sp-4);
  margin-bottom: var(--sp-4);
  border-bottom: 1px solid var(--border-light);
}

.top-right {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.body {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  gap: var(--sp-5);
  align-items: start;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  position: sticky;
  top: var(--sp-4);
  max-height: calc(100vh - 2 * var(--sp-4));
  overflow-y: auto;
}

.sidebar-actions {
  display: flex;
  gap: var(--sp-2);
}

.sidebar-actions .primary {
  flex: 1;
  justify-content: center;
}
</style>
