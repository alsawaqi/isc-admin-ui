<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'departments'
})

import { ref, onMounted } from 'vue'
import { useProductType } from '~/data/producttype'

const { getProductType } = useProductType()
const { $axios } = useNuxtApp()

interface ProductType {
  id: number | string;
  Product_Types_Name: string;
  created_at?: string;
  updated_at?: string;
}

/* ------------------------
   CREATE FORM STATE
-------------------------*/
const name = ref<string>('')            // create form input
const isSubmit = ref<boolean>(false)    // for disabling buttons / spinner (optional)

/* list */
const productTypes = ref<ProductType[]>([])

/* ------------------------
   EDIT MODAL STATE
-------------------------*/
const isEditOpen = ref<boolean>(false)

const editId = ref<number | string | null>(null)
const editName = ref<string>('')


const table = reactive({
  page: 1,
  perPage: 10,
  search: '',
  sortBy: 'id',
  sortDir: 'desc',
})

// paginator info from backend
const pagination = ref({
  total: 0,
  from: 0,
  to: 0,
  last_page: 1,
})

/* ------------------------
   CREATE HANDLER
-------------------------*/
const submitForm = async () => {
  isSubmit.value = true
  try {
    await $axios.post('/api/producttype', {
      name: name.value,
    })

    alert('Product Type created successfully')

    // clear form
    name.value = ''

    // refresh list
    productTypes.value = await getProductType()
  } catch (error: any) {
    alert(
      'Failed to create product type: ' +
        (error?.response?.data?.message || error?.message || 'Unknown error')
    )
  } finally {
    isSubmit.value = false
  }
}

/* ------------------------
   OPEN EDIT MODAL
-------------------------*/
const openEditModal = (pt: ProductType) => {
  isEditOpen.value = true
  editId.value = pt.id
  editName.value = pt.Product_Types_Name
}

/* ------------------------
   CLOSE EDIT MODAL
-------------------------*/
const closeEditModal = () => {
  isEditOpen.value = false
}


const getProductTypes = async () => {
  try {
    const { data } = await $axios.get('/api/producttype', {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        sort_by: table.sortBy,
        sort_dir: table.sortDir,
      },
    })

    productTypes.value =  data.data
     pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }
  } catch (error: any) {
    alert(
      'Failed to fetch product types: ' +
        (error?.response?.data?.message || error?.message || 'Unknown error')
    )
  }
}


watch(
   () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir],
   async (): Promise<void> => {
    await getProductTypes()
  }
)


/* ------------------------
   UPDATE HANDLER
-------------------------*/
const updateProductType = async (e: Event) => {
  e.preventDefault()

  if (!editId.value) {
    alert('No product type selected')
    return
  }

  isSubmit.value = true

  try {
    // send the updated name
    const payload = {
      name: editName.value,
    }

    // If your backend expects PUT:
    await $axios.put(`/api/producttype/${editId.value}`, payload)

    // If instead your backend expects POST + _method:
    // const formData = new FormData()
    // formData.append('name', editName.value)
    // formData.append('_method', 'PUT')
    // await $axios.post(`/api/producttype/${editId.value}`, formData)

    alert('Product Type updated successfully')

    // refresh list from DB so UI updates
    productTypes.value = await getProductType()

    // close modal
    isEditOpen.value = false
  } catch (error: any) {
    alert(
      'Failed to update product type: ' +
        (error?.response?.data?.message || error?.message || 'Unknown error')
    )
  } finally {
    isSubmit.value = false
  }
}

/* ------------------------
   (OPTIONAL) DELETE HANDLER
   you haven't implemented delete API yet, so just scaffold:
-------------------------*/
const deleteProductType = async (id: number | string) => {
  if (!confirm('Are you sure you want to delete this product type?')) {
    return
  }

  try {
    await $axios.delete(`/api/producttype/${id}`)
    productTypes.value = await getProductType()
  } catch (error: any) {
    alert(
      'Failed to delete product type: ' +
        (error?.response?.data?.message || error?.message || 'Unknown error')
    )
  }
}




/* ------------------------
   INITIAL LOAD
-------------------------*/
onMounted(async () => {
  await getProductTypes()
})
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #f97316">Create Product Types</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">Create Product Type</li>
      </ul>
    </div>

    <div class="card h-100 p-0 radius-12 overflow-hidden">
      <div class="card-body p-40">
        <form @submit.prevent="submitForm" class="row g-4">
          <div class="row">
            <div class="col-sm-12">
              <div class="mb-20">
                <label
                  for="new-product-type"
                  class="form-label fw-semibold text-primary-light text-sm mb-8"
                >
                  Name <span class="text-danger-600">*</span>
                </label>
                <input
                  id="new-product-type"
                  type="text"
                  class="form-control radius-8"
                  v-model="name"
                  placeholder="Enter product type name"
                  required
                />
              </div>
            </div>

            <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
              <button
                type="reset"
                class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8"
                @click="name = ''"
              >
                Reset
              </button>

              <button
                type="submit"
                class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
                :disabled="isSubmit"
              >
                <span
                  v-if="isSubmit"
                  class="spinner-border spinner-border-sm me-1"
                  role="status"
                  aria-hidden="true"
                ></span>
                Save Change
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- LIST -->
  <div class="dashboard-main-body">
    <div class="col-lg-12">
      <div class="card">
        <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div class="d-flex flex-wrap align-items-center gap-3">
            <div class="d-flex align-items-center gap-2">
              <span>Show</span>
               <select v-model.number="table.perPage" class="form-select form-select-sm w-auto">
                <option :value="10">10</option>
                <option :value="15">15</option>
                <option :value="20">20</option>
              </select>

              
            </div>

            <div class="icon-field">
              <input
                type="text"
                name="#0"
                class="form-control form-control-sm w-auto"
                placeholder="Search"
                v-model="table.search"
              />
              <span class="icon">
                <iconify-icon icon="ion:search-outline"></iconify-icon>
              </span>
            </div>
          </div>
        </div>

        <div class="card-body">
          <table class="table bordered-table mb-0">
            <thead>
              <tr>
                <th scope="col">
                  <div class="form-check style-check d-flex align-items-center">
                    <input class="form-check-input" type="checkbox" value="" id="checkAll" />
                    <label class="form-check-label" for="checkAll">S.L</label>
                  </div>
                </th>

                <th scope="col">Name</th>

                <th scope="col">Action</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(producttype, index) in productTypes"
                :key="producttype.id"
              >
                <td>
                  <div class="form-check style-check d-flex align-items-center">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      :id="'check-' + producttype.id"
                    />
                    <label
                      class="form-check-label"
                      :for="'check-' + producttype.id"
                    >
                      {{ index + 1 }}
                    </label>
                  </div>
                </td>

                <td>
                  <div class="d-flex align-items-center">
                    <h6 class="text-md mb-0 fw-medium flex-grow-1">
                      {{ producttype.Product_Types_Name }}
                    </h6>
                  </div>
                </td>

                <td>
                  <!-- EDIT BUTTON -->
                  <a
                    href="javascript:void(0)"
                    class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center"
                    @click.prevent="openEditModal(producttype)"
                  >
                    <iconify-icon icon="lucide:edit"></iconify-icon>
                  </a>

                  <!-- DELETE BUTTON -->
                  <a
                    href="javascript:void(0)"
                    class="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center"
                    @click.prevent="deleteProductType(producttype.id)"
                  >
                    <iconify-icon icon="mingcute:delete-2-line"></iconify-icon>
                  </a>
                </td>
              </tr>
            </tbody>
          </table>

            <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-24">
            <span>
              Showing {{ pagination.from || 0 }} to {{ pagination.to || 0 }} of {{ pagination.total || 0 }} entries
            </span>
            <ul class="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
              <!-- Prev -->
              <li class="page-item" :class="{ disabled: table.page === 1 }">
                <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                  href="javascript:void(0)" @click="table.page > 1 && (table.page -= 1)">
                  <iconify-icon icon="ep:d-arrow-left" class="text-xl"></iconify-icon>
                </a>
              </li>

              <!-- Page numbers -->
              <li v-for="p in pagination.last_page" :key="p" class="page-item">
                <a href="javascript:void(0)" @click="table.page = p" :class="[
                  'page-link fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px',
                  p === table.page
                    ? 'bg-primary-600 text-white'
                    : 'bg-primary-50 text-secondary-light'
                ]">
                  {{ p }}
                </a>
              </li>

              <!-- Next -->
              <li class="page-item" :class="{ disabled: table.page === pagination.last_page }">
                <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                  href="javascript:void(0)" @click="table.page < pagination.last_page && (table.page += 1)">
                  <iconify-icon icon="ep:d-arrow-right" class="text-xl"></iconify-icon>
                </a>
              </li>
            </ul>

          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- EDIT MODAL -->
  <transition
    enter-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isEditOpen"
      class="modal-backdrop"
      @click.self="closeEditModal"
    >
      <div class="modal-card" role="dialog" aria-modal="true">
        <!-- Header -->
        <div class="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
          <h6 class="fw-semibold mb-0">Edit Product Type</h6>
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            @click="closeEditModal"
          >
            ✕
          </button>
        </div>

        <!-- Body -->
        <form @submit.prevent="updateProductType">
          <div class="mb-3">
            <label class="form-label fw-semibold text-sm">
              Name <span class="text-danger">*</span>
            </label>
            <input
              type="text"
              class="form-control radius-8"
              placeholder="Enter product type name"
              v-model="editName"
              required
            />
          </div>

          <div class="d-flex align-items-center justify-content-end gap-2">
            <button
              type="button"
              class="btn btn-outline-secondary"
              @click="closeEditModal"
            >
              Cancel
            </button>

            <button
              type="submit"
              class="btn btn-primary"
              :disabled="isSubmit"
            >
              <span
                v-if="isSubmit"
                class="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
              ></span>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  </transition>
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
  box-shadow: 0 20px 40px rgba(0,0,0,.18);
  padding: 20px;
}
</style>
