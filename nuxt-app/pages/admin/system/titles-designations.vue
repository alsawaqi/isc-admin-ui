<script setup lang="ts">
import { definePageMeta, useNuxtApp } from '#imports'
import { ref, reactive, onMounted, watch } from 'vue'
import { useFlashStore } from '~/stores/flashs'

const flash = useFlashStore()

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permission: 'titles and designations'
})

const { $axios } = (useNuxtApp() as any)

interface LookupRow {
  id: number
  Is_Active: boolean | number
  [key: string]: any
}

/* =========================================================
   Generic CRUD state factory — one instance per lookup card
========================================================= */
const makeLookupCrud = (opts: {
  endpoint: string
  nameField: string
  nameArField: string
  label: string
}) => {
  const rows = ref<LookupRow[]>([])

  const table = reactive({
    page: 1,
    perPage: 10,
    search: '',
  })

  const pagination = reactive({
    total: 0,
    from: 0,
    to: 0,
    last_page: 1,
  })

  const isModalOpen = ref(false)
  const isSubmit = ref(false)
  const editId = ref<number | null>(null) // null => create
  const formName = ref('')
  const formNameAr = ref('')
  const formActive = ref(true)

  const fetchRows = async () => {
    try {
      const { data } = await $axios.get(opts.endpoint, {
        params: {
          page: table.page,
          per_page: table.perPage,
          search: table.search,
        },
      })

      rows.value = data.data
      pagination.total = data.total
      pagination.from = data.from
      pagination.to = data.to
      pagination.last_page = data.last_page
    } catch (error: any) {
      flash.error(
        `Failed to fetch ${opts.label.toLowerCase()}s: ` +
        (error?.response?.data?.message || error?.message || 'Unknown error')
      )
    }
  }

  watch(
    () => [table.page, table.perPage, table.search],
    async () => {
      await fetchRows()
    }
  )

  const openCreateModal = () => {
    editId.value = null
    formName.value = ''
    formNameAr.value = ''
    formActive.value = true
    isModalOpen.value = true
  }

  const openEditModal = (row: LookupRow) => {
    editId.value = row.id
    formName.value = row[opts.nameField] ?? ''
    formNameAr.value = row[opts.nameArField] ?? ''
    formActive.value = !!row.Is_Active
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
  }

  const submit = async () => {
    if (!formName.value.trim()) {
      flash.error(`Please enter the ${opts.label.toLowerCase()} name.`)
      return
    }

    isSubmit.value = true
    try {
      // API contract: TitlesController/DesignationsController validate the
      // generic lowercase keys {name, name_ar, is_active} for BOTH lookups
      // (not the PascalCase DB column names used in responses).
      const payload: Record<string, any> = {
        name: formName.value.trim(),
        name_ar: formNameAr.value.trim() || null,
        is_active: formActive.value,
      }

      if (editId.value) {
        await $axios.put(`${opts.endpoint}/${editId.value}`, payload)
        flash.success(`${opts.label} updated successfully`)
      } else {
        await $axios.post(opts.endpoint, payload)
        flash.success(`${opts.label} created successfully`)
      }

      isModalOpen.value = false
      await fetchRows()
    } catch (error: any) {
      flash.error(
        `Failed to save ${opts.label.toLowerCase()}: ` +
        (error?.response?.data?.message || error?.message || 'Unknown error')
      )
    } finally {
      isSubmit.value = false
    }
  }

  const toggleActive = async (row: LookupRow) => {
    try {
      await $axios.post(`${opts.endpoint}/${row.id}/toggle`)
      flash.success(`${opts.label} ${row.Is_Active ? 'deactivated' : 'activated'} successfully`)
      await fetchRows()
    } catch (error: any) {
      flash.error(
        `Failed to toggle ${opts.label.toLowerCase()}: ` +
        (error?.response?.data?.message || error?.message || 'Unknown error')
      )
    }
  }

  const destroy = async (row: LookupRow) => {
    const ok = await flash.confirm({
      title: `Delete ${opts.label.toLowerCase()}?`,
      message: `Are you sure you want to delete "${row[opts.nameField]}"? This cannot be undone.`,
      confirmText: 'Yes, delete',
      cancelText: 'No, cancel',
    })
    if (!ok) return

    try {
      await $axios.delete(`${opts.endpoint}/${row.id}`)
      flash.success(`${opts.label} deleted successfully`)
      await fetchRows()
    } catch (error: any) {
      flash.error(
        `Failed to delete ${opts.label.toLowerCase()}: ` +
        (error?.response?.data?.message || error?.message || 'Unknown error')
      )
    }
  }

  return {
    ...opts,
    rows,
    table,
    pagination,
    isModalOpen,
    isSubmit,
    editId,
    formName,
    formNameAr,
    formActive,
    fetchRows,
    openCreateModal,
    openEditModal,
    closeModal,
    submit,
    toggleActive,
    destroy,
  }
}

const titles = makeLookupCrud({
  endpoint: '/api/titles',
  nameField: 'Title_Name',
  nameArField: 'Title_Name_Ar',
  label: 'Title',
})

const designations = makeLookupCrud({
  endpoint: '/api/designations',
  nameField: 'Designation_Name',
  nameArField: 'Designation_Name_Ar',
  label: 'Designation',
})

const cards = [titles, designations]

onMounted(async () => {
  await Promise.all([titles.fetchRows(), designations.fetchRows()])
})
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #eab308">Titles &amp; Designations</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <NuxtLink to="/admin" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">Titles &amp; Designations</li>
      </ul>
    </div>

    <div class="row gy-4">
      <div v-for="crud in cards" :key="crud.endpoint" class="col-xxl-6 col-lg-12">
        <div class="card h-100">
          <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
            <h6 class="text-lg fw-semibold mb-0">{{ crud.label }}s</h6>
            <button type="button" class="btn btn-primary btn-sm px-16 py-8 radius-8"
              @click="crud.openCreateModal()">
              + Add {{ crud.label }}
            </button>
          </div>

          <div class="card-body">
            <div class="d-flex flex-wrap align-items-center gap-3 mb-16">
              <div class="d-flex align-items-center gap-2">
                <span>Show</span>
                <select v-model.number="crud.table.perPage" class="form-select form-select-sm w-auto">
                  <option :value="10">10</option>
                  <option :value="15">15</option>
                  <option :value="20">20</option>
                </select>
              </div>

              <div class="icon-field">
                <input type="text" class="form-control form-control-sm w-auto" placeholder="Search"
                  v-model="crud.table.search" />
                <span class="icon">
                  <iconify-icon icon="ion:search-outline"></iconify-icon>
                </span>
              </div>
            </div>

            <div class="table-responsive">
              <table class="table bordered-table mb-0">
                <thead>
                  <tr>
                    <th scope="col">S.L</th>
                    <th scope="col">Name</th>
                    <th scope="col">Name (Arabic)</th>
                    <th scope="col">Status</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!crud.rows.value.length">
                    <td colspan="5" class="text-center text-muted">No {{ crud.label.toLowerCase() }}s found.</td>
                  </tr>
                  <tr v-for="(row, index) in crud.rows.value" :key="row.id">
                    <td>{{ (crud.pagination.from || 1) + index }}</td>
                    <td>
                      <h6 class="text-md mb-0 fw-medium">{{ row[crud.nameField] }}</h6>
                    </td>
                    <td>{{ row[crud.nameArField] || '-' }}</td>
                    <td>
                      <span v-if="row.Is_Active"
                        class="bg-success-focus text-success-main px-16 py-4 rounded-pill fw-medium text-sm">
                        Active
                      </span>
                      <span v-else
                        class="bg-danger-focus text-danger-main px-16 py-4 rounded-pill fw-medium text-sm">
                        Inactive
                      </span>
                    </td>
                    <td>
                      <!-- EDIT -->
                      <a href="javascript:void(0)"
                        class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center me-4"
                        title="Edit" @click.prevent="crud.openEditModal(row)">
                        <iconify-icon icon="lucide:edit"></iconify-icon>
                      </a>

                      <!-- TOGGLE ACTIVE -->
                      <a href="javascript:void(0)"
                        class="w-32-px h-32-px bg-warning-focus text-warning-main rounded-circle d-inline-flex align-items-center justify-content-center me-4"
                        :title="row.Is_Active ? 'Deactivate' : 'Activate'" @click.prevent="crud.toggleActive(row)">
                        <iconify-icon :icon="row.Is_Active ? 'solar:eye-closed-outline' : 'solar:eye-outline'"></iconify-icon>
                      </a>

                      <!-- DELETE -->
                      <a href="javascript:void(0)"
                        class="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center"
                        title="Delete" @click.prevent="crud.destroy(row)">
                        <iconify-icon icon="mingcute:delete-2-line"></iconify-icon>
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-24">
              <span>
                Showing {{ crud.pagination.from || 0 }} to {{ crud.pagination.to || 0 }} of
                {{ crud.pagination.total || 0 }} entries
              </span>
              <ul class="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
                <!-- Prev -->
                <li class="page-item" :class="{ disabled: crud.table.page === 1 }">
                  <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                    href="javascript:void(0)" @click="crud.table.page > 1 && (crud.table.page -= 1)">
                    <iconify-icon icon="ep:d-arrow-left" class="text-xl"></iconify-icon>
                  </a>
                </li>

                <!-- Page numbers -->
                <li v-for="p in crud.pagination.last_page" :key="p" class="page-item">
                  <a href="javascript:void(0)" @click="crud.table.page = p" :class="[
                    'page-link fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px',
                    p === crud.table.page
                      ? 'bg-primary-600 text-white'
                      : 'bg-primary-50 text-secondary-light'
                  ]">
                    {{ p }}
                  </a>
                </li>

                <!-- Next -->
                <li class="page-item" :class="{ disabled: crud.table.page === crud.pagination.last_page }">
                  <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                    href="javascript:void(0)"
                    @click="crud.table.page < crud.pagination.last_page && (crud.table.page += 1)">
                    <iconify-icon icon="ep:d-arrow-right" class="text-xl"></iconify-icon>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- ADD / EDIT MODAL -->
        <transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0"
          enter-to-class="opacity-100" leave-active-class="transition-opacity duration-150"
          leave-from-class="opacity-100" leave-to-class="opacity-0">
          <div v-if="crud.isModalOpen.value" class="modal-backdrop" @click.self="crud.closeModal()">
            <div class="modal-card" role="dialog" aria-modal="true">
              <!-- Header -->
              <div class="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
                <h6 class="fw-semibold mb-0">
                  {{ crud.editId.value ? `Edit ${crud.label}` : `Add ${crud.label}` }}
                </h6>
                <button type="button" class="btn btn-sm btn-outline-secondary" @click="crud.closeModal()">
                  ✕
                </button>
              </div>

              <!-- Body -->
              <form @submit.prevent="crud.submit()">
                <div class="mb-3">
                  <label class="form-label fw-semibold text-sm">
                    Name <span class="text-danger">*</span>
                  </label>
                  <input type="text" class="form-control radius-8"
                    :placeholder="`Enter ${crud.label.toLowerCase()} name`" v-model="crud.formName.value" required />
                </div>

                <div class="mb-3">
                  <label class="form-label fw-semibold text-sm">Name (Arabic)</label>
                  <input type="text" class="form-control radius-8"
                    :placeholder="`Enter ${crud.label.toLowerCase()} name in Arabic`"
                    v-model="crud.formNameAr.value" />
                </div>

                <div class="mb-3">
                  <div class="form-check">
                    <input type="checkbox" class="form-check-input" :id="`active-${crud.nameField}`"
                      v-model="crud.formActive.value" />
                    <label class="form-check-label" :for="`active-${crud.nameField}`">Active</label>
                  </div>
                </div>

                <!-- Actions -->
                <div class="d-flex align-items-center justify-content-end gap-2">
                  <button type="button" class="btn btn-outline-secondary" @click="crud.closeModal()">
                    Cancel
                  </button>

                  <button type="submit" class="btn btn-primary" :disabled="crud.isSubmit.value">
                    <span v-if="crud.isSubmit.value" class="spinner-border spinner-border-sm me-1" role="status"
                      aria-hidden="true"></span>
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.5);
  display: grid;
  place-items: center;
  z-index: 1050;
}

.modal-card {
  width: min(480px, 92vw);
  max-height: 90vh;
  overflow: auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, .18);
  padding: 20px;
}
</style>
