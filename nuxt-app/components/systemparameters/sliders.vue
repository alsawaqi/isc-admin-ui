<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useNuxtApp, useRuntimeConfig } from '#imports'
import { useFlashStore } from '~/stores/flashs'

type SliderRow = {
  id: number
  Slider_Code?: string | null
  Title?: string | null
  Title_Ar?: string | null
  Link_Url?: string | null
  Sort_Order: number
  Is_Active: boolean
  Image_Path: string
  created_at?: string
}

const flash = useFlashStore()
const { $axios } = useNuxtApp() as any
const config = useRuntimeConfig()

const loading = ref(false)
const saving = ref(false)

const rows = ref<SliderRow[]>([])

const form = ref({
  Title: '',
  Title_Ar: '',
  Link_Url: '',
  Sort_Order: 0,
  Is_Active: true,
  file: null as File | null,
})

const r2 = (path: string) => `${config.public.r2Url}/${path}`

async function fetchRows() {
  loading.value = true
  try {
    rows.value = await $axios.get('/api/ui-sliders').then((r: any) => r.data)
  } catch (e: any) {
    flash.error('Failed to load sliders')
  } finally {
    loading.value = false
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  form.value.file = input.files?.[0] ?? null
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
    fd.append('Link_Url', form.value.Link_Url)
    fd.append('Sort_Order', String(form.value.Sort_Order ?? 0))
    fd.append('Is_Active', form.value.Is_Active ? '1' : '0')

    await $axios.post('/api/ui-sliders', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    flash.success('Slider uploaded.')
    form.value = { Title: '', Title_Ar: '', Link_Url: '', Sort_Order: 0, Is_Active: true, file: null }
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
  } catch (e: any) {
    flash.error('Delete failed.')
  }
}

onMounted(fetchRows)
</script>

<template>
  <div class="dashboard-main-body">
    <div class="row gy-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h6 class="card-title mb-0">UI Slider (Advertisements)</h6>
          </div>

          <div class="card-body">
            <form @submit.prevent="create">
              <div class="row gy-3">
                <div class="col-md-6">
                  <label class="form-label">Title (EN)</label>
                  <input class="form-control" v-model="form.Title" />
                </div>

                <div class="col-md-6">
                  <label class="form-label">Title (AR)</label>
                  <input class="form-control" v-model="form.Title_Ar" />
                </div>

                <div class="col-md-8">
                  <label class="form-label">Link URL (optional)</label>
                  <input class="form-control" v-model="form.Link_Url" placeholder="https://..." />
                </div>

                <div class="col-md-2">
                  <label class="form-label">Sort</label>
                  <input class="form-control" type="number" v-model="form.Sort_Order" />
                </div>

                <div class="col-md-2 d-flex align-items-end">
                  <div class="form-check">
                    <input class="form-check-input" type="checkbox" v-model="form.Is_Active" id="isActiveNew" />
                    <label class="form-check-label" for="isActiveNew">Active</label>
                  </div>
                </div>

                <div class="col-md-8">
                  <label class="form-label">Image</label>
                  <input class="form-control" type="file" accept="image/*" @change="onFileChange" />
                </div>

                <div class="col-md-4 d-flex align-items-end">
                  <button class="btn btn-primary w-100" :disabled="saving">
                    {{ saving ? 'Uploading...' : 'Upload Slider' }}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div class="card-body pt-0">
            <div v-if="loading" class="p-3">Loading...</div>

            <div v-else class="table-responsive">
              <table class="table table-bordered table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th style="width: 120px;">Preview</th>
                    <th>Title</th>
                    <th style="width: 220px;">Link</th>
                    <th style="width: 90px;">Sort</th>
                    <th style="width: 110px;">Active</th>
                    <th style="width: 180px;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in rows" :key="row.id">
                    <td>
                      <img :src="r2(row.Image_Path)" class="rounded" style="width: 110px; height: 60px; object-fit: cover;" />
                    </td>

                    <td>
                      <input class="form-control mb-2" v-model="row.Title" placeholder="Title (EN)" />
                      <input class="form-control" v-model="row.Title_Ar" placeholder="Title (AR)" />
                    </td>

                    <td>
                      <input class="form-control" v-model="row.Link_Url" placeholder="optional" />
                    </td>

                    <td>
                      <input class="form-control" type="number" v-model="row.Sort_Order" />
                    </td>

                    <td>
                      <button class="btn btn-sm" :class="row.Is_Active ? 'btn-success' : 'btn-outline-secondary'" @click="toggle(row)">
                        {{ row.Is_Active ? 'Active' : 'Off' }}
                      </button>
                    </td>

                    <td class="d-flex gap-2">
                      <button class="btn btn-sm btn-primary" :disabled="saving" @click="saveRow(row)">Save</button>
                      <button class="btn btn-sm btn-danger" @click="remove(row)">Delete</button>
                    </td>
                  </tr>

                  <tr v-if="rows.length === 0">
                    <td colspan="6" class="text-center text-muted py-4">No sliders yet.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>