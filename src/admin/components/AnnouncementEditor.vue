<script setup lang="ts">
import { computed, reactive, ref } from "vue"
import type { AnnouncementPlatform } from "@/modules/announcements/types"
import { TEXT_LIMITS } from "@/modules/announcements/utils/validate"
import { APP_LOCALES } from "../constants"
import { exists, saveAnnouncement } from "../services/adminApi"
import { toAnnouncement, type AnnouncementForm } from "../utils/form"
import AnnouncementPreview from "./AnnouncementPreview.vue"

const props = defineProps<{
  initial: AnnouncementForm
  /** Editing a stored announcement: its id is fixed. */
  existing: boolean
}>()

const emit = defineEmits<{ saved: [id: string]; cancel: [] }>()

// A JSON copy, not structuredClone: the prop may arrive as a reactive proxy.
const form = reactive<AnnouncementForm>(JSON.parse(JSON.stringify(props.initial)))
const saving = ref(false)
const saveError = ref<string | null>(null)
const showErrors = ref(false)

const PLATFORMS: AnnouncementPlatform[] = ["android", "ios", "web"]

const result = computed(() => toAnnouncement(form, APP_LOCALES))
const errors = computed(() => (result.value.ok ? [] : result.value.errors))
const unusedLocales = computed(() =>
  APP_LOCALES.filter((l) => !form.content.some((r) => r.locale === l))
)
const missingLocales = computed(() => unusedLocales.value.length)

function addLocale(event: Event) {
  const select = event.target as HTMLSelectElement
  if (select.value) form.content.push({ locale: select.value, title: "", body: "", cta: "" })
  select.value = ""
}

function removeLocale(index: number) {
  const [removed] = form.content.splice(index, 1)
  if (removed && form.defaultLocale === removed.locale) form.defaultLocale = ""
}

function togglePlatform(p: AnnouncementPlatform) {
  const i = form.platforms.indexOf(p)
  if (i >= 0) form.platforms.splice(i, 1)
  else form.platforms.push(p)
}

async function save() {
  showErrors.value = true
  saveError.value = null
  const r = result.value
  if (!r.ok) return
  saving.value = true
  try {
    if (!props.existing && (await exists(r.announcement.id))) {
      const ok = confirm(`"${r.announcement.id}" zaten var. Üzerine yazılsın mı?`)
      if (!ok) return
    }
    await saveAnnouncement(r.announcement)
    emit("saved", r.announcement.id)
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : String(error)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="editor">
    <form class="fields" @submit.prevent="save">
      <section class="form-card">
        <div class="form-section-title">Genel</div>
        <div class="grid">
          <label class="field span-2">
            <span class="form-label">ID</span>
            <input v-model="form.id" :disabled="existing" placeholder="market-launch" />
            <span class="form-hint">
              Cihazlar gösterdikleri id'yi hatırlar. Herkese tekrar göstermek için yeni bir id ile
              kopyala.
            </span>
          </label>
          <label class="field">
            <span class="form-label">Başlangıç</span>
            <input v-model="form.startAt" type="datetime-local" />
          </label>
          <label class="field">
            <span class="form-label">Bitiş</span>
            <input v-model="form.endAt" type="datetime-local" />
          </label>
          <label class="field">
            <span class="form-label">Sıklık</span>
            <select v-model="form.frequency">
              <option value="once">Bir kez</option>
              <option value="daily">Günde bir</option>
              <option value="launch">Her açılışta</option>
            </select>
          </label>
          <label class="field">
            <span class="form-label">Öncelik</span>
            <input v-model.number="form.priority" type="number" step="1" />
          </label>
          <label class="check">
            <input v-model="form.enabled" type="checkbox" />
            Aktif
          </label>
        </div>
      </section>

      <section class="form-card">
        <div class="form-section-title">Hedef kitle</div>
        <div class="grid">
          <div class="field span-2">
            <span class="form-label">Platformlar (hiçbiri seçili değilse hepsi)</span>
            <div class="checks">
              <label v-for="p in PLATFORMS" :key="p" class="check">
                <input
                  type="checkbox"
                  :checked="form.platforms.includes(p)"
                  @change="togglePlatform(p)"
                />
                {{ p }}
              </label>
            </div>
          </div>
          <label class="field">
            <span class="form-label">Min versiyon</span>
            <input v-model="form.minVersion" placeholder="4.0.0" />
          </label>
          <label class="field">
            <span class="form-label">Max versiyon</span>
            <input v-model="form.maxVersion" placeholder="4.9.9" />
          </label>
          <label class="field span-2">
            <span class="form-label">Varsayılan dil</span>
            <select v-model="form.defaultLocale">
              <option value="">Yok: sadece listedeki dilleri kullananlar görür</option>
              <option v-for="r in form.content" :key="r.locale" :value="r.locale">
                {{ r.locale }}
              </option>
            </select>
            <span v-if="missingLocales" class="form-hint">
              {{ missingLocales }} dilde metin yok;
              {{
                form.defaultLocale
                  ? `onlar "${form.defaultLocale}" görür.`
                  : "o dilleri kullananlar duyuruyu görmez."
              }}
            </span>
          </label>
        </div>
      </section>

      <section class="form-card">
        <div class="form-section-title">Aksiyon ve görsel</div>
        <div class="grid">
          <label class="field">
            <span class="form-label">Buton aksiyonu</span>
            <select v-model="form.actionType">
              <option value="none">Yok</option>
              <option value="route">Uygulama içi sayfa</option>
              <option value="url">Dış link</option>
            </select>
          </label>
          <label v-if="form.actionType !== 'none'" class="field">
            <span class="form-label">Hedef</span>
            <input
              v-model="form.actionTarget"
              :placeholder="form.actionType === 'route' ? '/market' : 'https://…'"
            />
          </label>
          <label class="field span-2">
            <span class="form-label">Görsel URL (https, 2:1)</span>
            <input v-model="form.imageUrl" placeholder="https://…" />
          </label>
        </div>
      </section>

      <section class="form-card">
        <div class="form-section-header">
          <div class="form-section-title">İçerik</div>
          <select v-if="unusedLocales.length" class="add-locale" @change="addLocale">
            <option value="">+ Dil ekle</option>
            <option v-for="l in unusedLocales" :key="l" :value="l">{{ l }}</option>
          </select>
        </div>
        <div class="locales">
          <div v-for="(row, i) in form.content" :key="row.locale" class="locale">
            <div class="locale-head">
              <strong>{{ row.locale }}</strong>
              <button type="button" class="btn-xs danger" @click="removeLocale(i)">Kaldır</button>
            </div>
            <label class="field">
              <span class="form-label">
                Başlık
                <span class="count">{{ row.title.length }}/{{ TEXT_LIMITS.title }}</span>
              </span>
              <input v-model="row.title" :maxlength="TEXT_LIMITS.title" />
            </label>
            <label class="field">
              <span class="form-label">
                Metin
                <span class="count">{{ row.body.length }}/{{ TEXT_LIMITS.body }}</span>
              </span>
              <textarea v-model="row.body" rows="3" :maxlength="TEXT_LIMITS.body" />
            </label>
            <label v-if="form.actionType !== 'none'" class="field">
              <span class="form-label">
                Buton yazısı
                <span class="count">{{ row.cta.length }}/{{ TEXT_LIMITS.cta }}</span>
              </span>
              <input v-model="row.cta" :maxlength="TEXT_LIMITS.cta" />
            </label>
          </div>
        </div>
      </section>

      <ul v-if="showErrors && errors.length" class="errors">
        <li v-for="e in errors" :key="e">{{ e }}</li>
      </ul>
      <p v-if="saveError" class="errors">Kaydedilemedi: {{ saveError }}</p>

      <div class="actions">
        <button type="button" @click="emit('cancel')">Vazgeç</button>
        <button type="submit" class="primary" :disabled="saving">
          {{ saving ? "Kaydediliyor…" : existing ? "Güncelle" : "Yayınla" }}
        </button>
      </div>
    </form>

    <aside class="side">
      <div class="form-section-title">Önizleme</div>
      <AnnouncementPreview :form="form" />
    </aside>
  </div>
</template>

<style scoped>
.editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: var(--sp-5);
  align-items: start;
}

.side {
  position: sticky;
  top: var(--sp-4);
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-3);
}

.span-2 {
  grid-column: span 2;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  min-width: 0;
}

.field input,
.field select,
.field textarea {
  width: 100%;
}

.field textarea {
  resize: vertical;
  font-family: var(--font-ui);
}

.check {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-sm);
  cursor: pointer;
}

.check input {
  padding: 0;
  accent-color: var(--accent);
}

.checks {
  display: flex;
  gap: var(--sp-4);
}

.locales {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.locale {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-3);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
}

.locale-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.count {
  font-weight: 400;
  color: var(--text-muted);
}

.errors {
  margin: 0 0 var(--sp-3);
  padding: var(--sp-3) var(--sp-3) var(--sp-3) var(--sp-5);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--danger) 10%, transparent);
  color: var(--danger);
  font-size: var(--fs-sm);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-2);
}
</style>
