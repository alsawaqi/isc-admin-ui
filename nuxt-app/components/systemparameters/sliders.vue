<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useNuxtApp, useRuntimeConfig } from '#imports'
import { useFlashStore } from '~/stores/flashs'

type SliderRow = {
  id: number
  Slider_Code?: string | null
  Title?: string | null
  Title_Ar?: string | null
  Description?: string | null
  Description_Ar?: string | null
  Button_Text?: string | null
  Button_Text_Ar?: string | null
  Link_Url?: string | null
  Sort_Order: number
  Is_Active: boolean
  Image_Path: string
  image_url?: string | null
  created_at?: string
}

const flash = useFlashStore()
const { $axios } = useNuxtApp() as any
const config = useRuntimeConfig()

const loading = ref(false)
const saving = ref(false)
const orderSaving = ref(false)
const draggedId = ref<number | null>(null)
const dragOverId = ref<number | null>(null)
const rows = ref<SliderRow[]>([])
const previewUrl = ref('')
const fileInputKey = ref(0)

const form = ref({
  Title: '',
  Title_Ar: '',
  Description: '',
  Description_Ar: '',
  Button_Text: '',
  Button_Text_Ar: '',
  Link_Url: '',
  Is_Active: true,
  file: null as File | null,
})

const activeCount = computed(() => rows.value.filter((row) => row.Is_Active).length)
const inactiveCount = computed(() => rows.value.length - activeCount.value)
const selectedFileName = computed(() => form.value.file?.name || '')

const publicR2Base = () => String(config.public.r2Url || '').replace(/\/+$/, '')

function normalizeSliderImagePath(value?: string | null) {
  const raw = String(value || '').trim().replace(/\\/g, '/')
  if (!raw) return ''

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw)
      if (url.hostname.includes('r2.dev')) return raw

      const path = decodeURIComponent(url.pathname).replace(/^\/+/, '')
      const sliderIndex = path.indexOf('Sliders/')
      if (sliderIndex >= 0) return path.slice(sliderIndex)

      const segments = path.split('/').filter(Boolean)
      if (url.hostname.includes('r2.cloudflarestorage.com') && segments.length > 1) {
        segments.shift()
        return segments.join('/')
      }

      return raw
    } catch {
      return raw
    }
  }

  const path = raw.replace(/^\/+/, '')
  const sliderIndex = path.indexOf('Sliders/')
  return sliderIndex >= 0 ? path.slice(sliderIndex) : path
}

const imageSrc = (row: SliderRow) => {
  const base = publicR2Base()
  const path = normalizeSliderImagePath(row.Image_Path || row.image_url)
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return encodeURI(`${base}/${path}`)
}

function normalizeRows(data: SliderRow[]) {
  return (data || [])
    .map((row, index) => ({
      ...row,
      Sort_Order: Number(row.Sort_Order ?? index + 1),
      Is_Active: Boolean(row.Is_Active),
    }))
    .sort((a, b) => Number(a.Sort_Order) - Number(b.Sort_Order) || Number(b.id) - Number(a.id))
}

async function fetchRows() {
  loading.value = true
  try {
    const data = await $axios.get('/api/ui-sliders').then((r: any) => r.data)
    rows.value = normalizeRows(data)
  } catch (e: any) {
    flash.error('Failed to load sliders')
  } finally {
    loading.value = false
  }
}

function resetForm() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  fileInputKey.value += 1
  form.value = {
    Title: '',
    Title_Ar: '',
    Description: '',
    Description_Ar: '',
    Button_Text: '',
    Button_Text_Ar: '',
    Link_Url: '',
    Is_Active: true,
    file: null,
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  form.value.file = file

  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = file ? URL.createObjectURL(file) : ''
}

async function create() {
  if (!form.value.file) {
    flash.error('Please choose an image first.')
    return
  }

  saving.value = true
  try {
    const fd = new FormData()
    fd.append('file', form.value.file)
    fd.append('Title', form.value.Title)
    fd.append('Title_Ar', form.value.Title_Ar)
    fd.append('Description', form.value.Description)
    fd.append('Description_Ar', form.value.Description_Ar)
    fd.append('Button_Text', form.value.Button_Text)
    fd.append('Button_Text_Ar', form.value.Button_Text_Ar)
    fd.append('Link_Url', form.value.Link_Url)
    fd.append('Sort_Order', String(rows.value.length + 1))
    fd.append('Is_Active', form.value.Is_Active ? '1' : '0')

    await $axios.post('/api/ui-sliders', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    flash.success('Slider uploaded.')
    resetForm()
    await fetchRows()
  } catch (e: any) {
    flash.error('Upload failed.')
  } finally {
    saving.value = false
  }
}

async function saveRow(row: SliderRow) {
  saving.value = true
  try {
    await $axios.post(`/api/ui-sliders/${row.id}`, {
      Title: row.Title,
      Title_Ar: row.Title_Ar,
      Description: row.Description,
      Description_Ar: row.Description_Ar,
      Button_Text: row.Button_Text,
      Button_Text_Ar: row.Button_Text_Ar,
      Link_Url: row.Link_Url,
      Sort_Order: row.Sort_Order,
      Is_Active: row.Is_Active ? 1 : 0,
    })
    flash.success('Saved.')
    await fetchRows()
  } catch (e: any) {
    flash.error('Save failed.')
  } finally {
    saving.value = false
  }
}

async function toggle(row: SliderRow) {
  try {
    await $axios.post(`/api/ui-sliders/${row.id}/toggle`)
    await fetchRows()
  } catch (e: any) {
    flash.error('Toggle failed.')
  }
}

async function remove(row: SliderRow) {
  const ok = await flash.confirm({
    title: 'Delete slider?',
    message: 'This will delete the slider record and its image from storage.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
  })

  if (!ok) return

  try {
    await $axios.delete(`/api/ui-sliders/${row.id}`)
    flash.success('Deleted.')
    await fetchRows()
    await persistOrder(false)
  } catch (e: any) {
    flash.error('Delete failed.')
  }
}

function renumberRows() {
  rows.value = rows.value.map((row, index) => ({
    ...row,
    Sort_Order: index + 1,
  }))
}

async function persistOrder(showMessage = true) {
  renumberRows()
  orderSaving.value = true
  try {
    await $axios.post('/api/ui-sliders/reorder', {
      items: rows.value.map((row) => ({
        id: row.id,
        Sort_Order: row.Sort_Order,
      })),
    })
    if (showMessage) flash.success('Slider order updated.')
  } catch (e: any) {
    flash.error('Could not save slider order.')
    await fetchRows()
  } finally {
    orderSaving.value = false
  }
}

function onDragStart(row: SliderRow, event: DragEvent) {
  draggedId.value = row.id
  event.dataTransfer?.setData('text/plain', String(row.id))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onDragOver(row: SliderRow, event: DragEvent) {
  event.preventDefault()
  dragOverId.value = row.id
}

async function onDrop(targetRow: SliderRow, event: DragEvent) {
  event.preventDefault()
  const sourceId = draggedId.value ?? Number(event.dataTransfer?.getData('text/plain') || 0)
  if (!sourceId || sourceId === targetRow.id) {
    onDragEnd()
    return
  }

  const fromIndex = rows.value.findIndex((row) => row.id === sourceId)
  const toIndex = rows.value.findIndex((row) => row.id === targetRow.id)
  if (fromIndex < 0 || toIndex < 0) {
    onDragEnd()
    return
  }

  const next = [...rows.value]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  rows.value = next
  onDragEnd()
  await persistOrder()
}

function onDragEnd() {
  draggedId.value = null
  dragOverId.value = null
}

async function moveRow(index: number, direction: -1 | 1) {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= rows.value.length) return

  const next = [...rows.value]
  const [moved] = next.splice(index, 1)
  next.splice(targetIndex, 0, moved)
  rows.value = next
  await persistOrder()
}

onMounted(fetchRows)
onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<template>
  <div class="dashboard-main-body">
    <div class="slider-page">
      <div class="slider-hero">
        <div>
          <p class="eyebrow mb-1">System Parameters</p>
          <h5 class="mb-1">UI Slider Advertisements</h5>
          <p class="text-muted mb-0">Create homepage slides, publish them, and drag cards to control the customer display order.</p>
        </div>
        <div class="slider-stats">
          <div>
            <span>{{ rows.length }}</span>
            <small>Total</small>
          </div>
          <div>
            <span>{{ activeCount }}</span>
            <small>Active</small>
          </div>
          <div>
            <span>{{ inactiveCount }}</span>
            <small>Off</small>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-12 col-xl-4">
          <div class="slider-panel h-100">
            <div class="panel-heading">
              <div>
                <h6 class="mb-1">New Slider</h6>
                <p class="text-muted mb-0">Add the image and text that customers should see.</p>
              </div>
            </div>

            <form class="p-3 p-lg-4" @submit.prevent="create">
              <div class="upload-preview mb-3" :class="{ empty: !previewUrl }">
                <img v-if="previewUrl" :src="previewUrl" alt="Selected slider preview" />
                <div v-else>
                  <iconify-icon icon="solar:gallery-add-outline" class="preview-icon"></iconify-icon>
                  <p class="mb-1 fw-semibold">Slider image</p>
                  <small class="text-muted">Recommended wide banner image</small>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Image</label>
                <input :key="fileInputKey" class="form-control" type="file" accept="image/*" @change="onFileChange" />
                <small v-if="selectedFileName" class="text-muted">{{ selectedFileName }}</small>
              </div>

              <div class="mb-3">
                <label class="form-label">Title (EN)</label>
                <input class="form-control" v-model="form.Title" placeholder="Example: Power tools promotion" />
              </div>

              <div class="mb-3">
                <label class="form-label">Title (AR)</label>
                <input class="form-control" v-model="form.Title_Ar" />
              </div>

              <div class="mb-3">
                <label class="form-label">Description (EN)</label>
                <textarea class="form-control" rows="3" v-model="form.Description" placeholder="Short text shown on the homepage slide"></textarea>
              </div>

              <div class="mb-3">
                <label class="form-label">Description (AR)</label>
                <textarea class="form-control" rows="2" v-model="form.Description_Ar"></textarea>
              </div>

              <div class="row g-3">
                <div class="col-md-6 col-xl-12">
                  <label class="form-label">Button Text (EN)</label>
                  <input class="form-control" v-model="form.Button_Text" placeholder="Shop now" />
                </div>
                <div class="col-md-6 col-xl-12">
                  <label class="form-label">Button Text (AR)</label>
                  <input class="form-control" v-model="form.Button_Text_Ar" />
                </div>
              </div>

              <div class="mt-3">
                <label class="form-label">Link URL (optional)</label>
                <input class="form-control" v-model="form.Link_Url" placeholder="https://... or /departments/tools" />
              </div>

              <div class="d-flex align-items-center justify-content-between gap-3 mt-4">
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" v-model="form.Is_Active" id="isActiveNew" />
                  <label class="form-check-label" for="isActiveNew">Publish immediately</label>
                </div>

                <button class="btn btn-primary upload-btn" :disabled="saving">
                  <iconify-icon icon="solar:upload-minimalistic-outline"></iconify-icon>
                  {{ saving ? 'Uploading...' : 'Upload' }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div class="col-12 col-xl-8">
          <div class="slider-panel">
            <div class="panel-heading">
              <div>
                <h6 class="mb-1">Slider Order</h6>
                <p class="text-muted mb-0">Drag a slide card up or down. The order saves automatically.</p>
              </div>
              <span class="order-status" :class="{ saving: orderSaving }">
                {{ orderSaving ? 'Saving order...' : 'Drag to sort' }}
              </span>
            </div>

            <div v-if="loading" class="p-4 text-muted">Loading sliders...</div>

            <div v-else-if="rows.length === 0" class="empty-state">
              <iconify-icon icon="solar:gallery-outline"></iconify-icon>
              <p class="mb-1 fw-semibold">No sliders yet</p>
              <small class="text-muted">Create the first homepage advertisement from the form.</small>
            </div>

            <div v-else class="slider-list">
              <article
                v-for="(row, index) in rows"
                :key="row.id"
                class="slider-item"
                :class="{ dragging: draggedId === row.id, over: dragOverId === row.id }"
                draggable="true"
                @dragstart="onDragStart(row, $event)"
                @dragover="onDragOver(row, $event)"
                @drop="onDrop(row, $event)"
                @dragend="onDragEnd"
              >
                <div class="sort-rail">
                  <button class="drag-handle" type="button" title="Drag to reorder" aria-label="Drag to reorder">
                    <iconify-icon icon="lucide:grip-vertical"></iconify-icon>
                  </button>
                  <span class="order-number">{{ index + 1 }}</span>
                  <div class="move-buttons">
                    <button type="button" class="btn btn-light btn-sm" :disabled="index === 0 || orderSaving" @click="moveRow(index, -1)" title="Move up">
                      <iconify-icon icon="lucide:chevron-up"></iconify-icon>
                    </button>
                    <button type="button" class="btn btn-light btn-sm" :disabled="index === rows.length - 1 || orderSaving" @click="moveRow(index, 1)" title="Move down">
                      <iconify-icon icon="lucide:chevron-down"></iconify-icon>
                    </button>
                  </div>
                </div>

                <div class="slide-thumb">
                  <img :src="imageSrc(row)" alt="Slider preview" />
                  <span class="status-pill" :class="row.Is_Active ? 'active' : 'off'">
                    {{ row.Is_Active ? 'Active' : 'Off' }}
                  </span>
                </div>

                <div class="slide-fields">
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label class="form-label">Title (EN)</label>
                      <input class="form-control" v-model="row.Title" placeholder="Title (EN)" />
                    </div>
                    <div class="col-md-6">
                      <label class="form-label">Title (AR)</label>
                      <input class="form-control" v-model="row.Title_Ar" placeholder="Title (AR)" />
                    </div>
                    <div class="col-md-6">
                      <label class="form-label">Description (EN)</label>
                      <textarea class="form-control" rows="2" v-model="row.Description" placeholder="Homepage slide text"></textarea>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label">Description (AR)</label>
                      <textarea class="form-control" rows="2" v-model="row.Description_Ar"></textarea>
                    </div>
                    <div class="col-md-4">
                      <label class="form-label">Button Text</label>
                      <input class="form-control" v-model="row.Button_Text" placeholder="Shop now" />
                    </div>
                    <div class="col-md-4">
                      <label class="form-label">Button Text (AR)</label>
                      <input class="form-control" v-model="row.Button_Text_Ar" />
                    </div>
                    <div class="col-md-4">
                      <label class="form-label">Link</label>
                      <input class="form-control" v-model="row.Link_Url" placeholder="optional" />
                    </div>
                  </div>

                  <div class="slide-actions">
                    <button class="btn btn-outline-secondary btn-sm" type="button" @click="toggle(row)">
                      <iconify-icon :icon="row.Is_Active ? 'lucide:eye-off' : 'lucide:eye'"></iconify-icon>
                      {{ row.Is_Active ? 'Unpublish' : 'Publish' }}
                    </button>
                    <button class="btn btn-primary btn-sm" type="button" :disabled="saving" @click="saveRow(row)">
                      <iconify-icon icon="lucide:save"></iconify-icon>
                      Save
                    </button>
                    <button class="btn btn-danger btn-sm" type="button" @click="remove(row)">
                      <iconify-icon icon="mingcute:delete-2-line"></iconify-icon>
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slider-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.slider-hero,
.slider-panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}

.slider-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
}

.eyebrow {
  color: #2563eb;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.slider-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(82px, 1fr));
  gap: 8px;
}

.slider-stats div {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 12px;
  min-width: 82px;
}

.slider-stats span {
  display: block;
  color: #0f172a;
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
}

.slider-stats small {
  color: #64748b;
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid #edf2f7;
}

.upload-preview {
  display: grid;
  place-items: center;
  aspect-ratio: 16 / 7;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  overflow: hidden;
  background: #f8fafc;
  text-align: center;
}

.upload-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-icon {
  color: #2563eb;
  font-size: 34px;
}

.upload-btn,
.slide-actions .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.order-status {
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  color: #1d4ed8;
  background: #eff6ff;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 10px;
  white-space: nowrap;
}

.order-status.saving {
  border-color: #fde68a;
  color: #92400e;
  background: #fffbeb;
}

.empty-state {
  display: grid;
  place-items: center;
  min-height: 260px;
  padding: 32px;
  text-align: center;
}

.empty-state iconify-icon {
  color: #94a3b8;
  font-size: 38px;
  margin-bottom: 8px;
}

.slider-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
}

.slider-item {
  display: grid;
  grid-template-columns: 64px minmax(180px, 240px) 1fr;
  gap: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.slider-item.over {
  border-color: #2563eb;
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.14);
}

.slider-item.dragging {
  opacity: 0.62;
  transform: scale(0.995);
}

.sort-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border-right: 1px solid #edf2f7;
  padding-right: 12px;
}

.drag-handle {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #f8fafc;
  color: #475569;
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}

.order-number {
  display: grid;
  place-items: center;
  width: 34px;
  height: 28px;
  border-radius: 8px;
  background: #0f172a;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.move-buttons {
  display: grid;
  gap: 4px;
}

.move-buttons .btn {
  display: grid;
  place-items: center;
  width: 34px;
  height: 30px;
  padding: 0;
}

.slide-thumb {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  background: #e2e8f0;
  aspect-ratio: 16 / 9;
  align-self: start;
}

.slide-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-pill {
  position: absolute;
  top: 8px;
  left: 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
}

.status-pill.active {
  color: #065f46;
  background: #d1fae5;
}

.status-pill.off {
  color: #475569;
  background: #f1f5f9;
}

.slide-fields {
  min-width: 0;
}

.slide-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

@media (max-width: 991.98px) {
  .slider-hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .slider-stats {
    width: 100%;
  }

  .slider-item {
    grid-template-columns: 48px 1fr;
  }

  .slide-thumb {
    grid-column: 2;
  }

  .slide-fields {
    grid-column: 1 / -1;
  }
}

@media (max-width: 575.98px) {
  .slider-stats {
    grid-template-columns: 1fr;
  }

  .slider-item {
    grid-template-columns: 1fr;
  }

  .sort-rail {
    flex-direction: row;
    justify-content: space-between;
    border-right: 0;
    border-bottom: 1px solid #edf2f7;
    padding-right: 0;
    padding-bottom: 10px;
  }

  .move-buttons {
    display: flex;
  }

  .slide-thumb,
  .slide-fields {
    grid-column: auto;
  }
}
</style>
