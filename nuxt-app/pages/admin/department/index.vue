<script lang="ts" setup>
import { useNuxtApp, definePageMeta } from '#imports';
import { ref, onMounted, reactive, watch } from 'vue';
import { useFlashStore } from '~/stores/flashs'

const flash = useFlashStore()

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'departments'
})

const { $axios } = (useNuxtApp() as any);

interface Department {
  id: number;
  Department_Name: string;
  Department_Initials: string;
}

const departments = ref<Department[]>([]);
const departmentName = ref<string>('');
const departmentInitials = ref<string>('');
const isSubmit = ref<boolean>(false);
const isLoading = ref<boolean>(false);

// table state
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

// ---------- EDIT MODAL STATE ----------
const showEdit = ref<boolean>(false)
const editId = ref<number | null>(null)
const editDepartmentName = ref<string>('')
const editDepartmentInitials = ref<string>('')
const savingEdit = ref<boolean>(false)
const errorMessage = ref<string | null>(null)

// ---------- API HELPERS ----------
const getDepartments = async () => {
  isLoading.value = true;
  try {
    const { data } = await $axios.get('/api/contact/departments', {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        sort_by: table.sortBy,
        sort_dir: table.sortDir,
      },
    })

    departments.value = data.data;
    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }

  } catch (error: any) {
    console.error('Failed to fetch departments:', error);
    flash.error(
      'Failed to fetch departments: ' +
      (error?.response?.data?.message || error?.message || 'Unknown error')
    )
  } finally {
    isLoading.value = false;
  }
};

const Submit = async () => {
  isSubmit.value = true;
  errorMessage.value = null

  try {
    await $axios.post('/api/contact/departments', {
      Department_Name: departmentName.value,
      Department_Initials: departmentInitials.value,
    });

    departmentName.value = '';
    departmentInitials.value = '';
    await getDepartments();
    flash.success('Department created successfully.');

  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      'Failed to create department. Please try again.'
    errorMessage.value = msg
    flash.error(msg);
  } finally {
    isSubmit.value = false;
  }
};

// ---------- EDIT HANDLERS ----------
const openEdit = (dept: Department) => {
  errorMessage.value = null
  editId.value = dept.id
  editDepartmentName.value = dept.Department_Name
  editDepartmentInitials.value = dept.Department_Initials
  showEdit.value = true
}

const closeEdit = () => {
  showEdit.value = false
  editId.value = null
  editDepartmentName.value = ''
  editDepartmentInitials.value = ''
  errorMessage.value = null
}

const saveEdit = async () => {
  if (!editId.value) return

  savingEdit.value = true
  errorMessage.value = null

  try {
    await $axios.put(`/api/contact/departments/${editId.value}`, {
      Department_Name: editDepartmentName.value,
      Department_Initials: editDepartmentInitials.value,
    })

    flash.success('Department updated successfully.')
    await getDepartments()
    closeEdit()
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      'Failed to update department.'
    errorMessage.value = msg
    flash.error(msg)
  } finally {
    savingEdit.value = false
  }
}

// ---------- DELETE ----------
const deleteDepartment = async (dept: Department) => {
  const ok = await flash.confirm({
    title: 'Delete department?',
    message: `Are you sure you want to delete "${dept.Department_Name}"? This cannot be undone.`,
    confirmText: 'Yes, delete',
    cancelText: 'No, cancel',
  })

  if (!ok) return

  try {
    await $axios.delete(`/api/contact/departments/${dept.id}`)
    flash.success('Department deleted successfully.')
    await getDepartments()
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      'Failed to delete department.'
    flash.error(msg)
  }
}

// ---------- WATCHERS ----------
watch(
  () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir],
  async () => {
    await getDepartments();
  }
);

onMounted(async () => {
  await getDepartments();
});
</script>

<template>
  <!-- CREATE -->
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #6b8629">Contact Department</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">Contact Department</li>
      </ul>
    </div>

    <div class="card h-100 p-0 radius-12 overflow-hidden">
      <div class="card-body p-40">
        <form @submit.prevent="Submit">
          <div class="row">
            <div class="col-sm-12">
              <div class="mb-20">
                <label
                  for="dept-name"
                  class="form-label fw-semibold text-primary-light text-sm mb-8"
                >
                  Name* <span class="text-danger-600">*</span>
                </label>
                <input
                  id="dept-name"
                  type="text"
                  v-model="departmentName"
                  class="form-control radius-8"
                  placeholder="Enter Department Name"
                  required
                />
              </div>
            </div>

            <div class="col-sm-12">
              <div class="mb-20">
                <label
                  for="dept-initials"
                  class="form-label fw-semibold text-primary-light text-sm mb-8"
                >
                  Initials* <span class="text-danger-600">*</span>
                </label>
                <input
                  id="dept-initials"
                  type="text"
                  v-model="departmentInitials"
                  class="form-control radius-8"
                  placeholder="Enter Department Initials"
                  required
                />
              </div>
            </div>

            <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
              <button
                type="reset"
                class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8"
                @click="
                  departmentName = '';
                  departmentInitials = '';
                "
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
                  class="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
                <span v-else>Save Change</span>
              </button>
            </div>

            <div
              v-if="errorMessage"
              class="alert alert-danger py-8 px-12 mt-3"
              role="alert"
            >
              {{ errorMessage }}
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
                v-model="table.search"
                type="text"
                name="search"
                class="form-control form-control-sm w-auto"
                placeholder="Search"
              />
              <span class="icon">
                <iconify-icon icon="ion:search-outline"></iconify-icon>
              </span>
            </div>
          </div>
        </div>

        <div class="card-body">
          <div class="spinner-border" role="status" v-if="isLoading">
            <span class="sr-only">Loading...</span>
          </div>

          <table class="table bordered-table mb-0" v-else>
            <thead>
              <tr>
                <th scope="col">
                  <div class="form-check style-check d-flex align-items-center">
                    <input class="form-check-input" type="checkbox" value="" id="checkAll" />
                    <label class="form-check-label" for="checkAll">
                      S.L
                    </label>
                  </div>
                </th>
                <th scope="col">Name</th>
                <th scope="col">Initials</th>
                <th scope="col">Action</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="(dept, index) in departments" :key="dept.id">
                <td>
                  <div class="form-check style-check d-flex align-items-center">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      :id="'check-' + dept.id"
                    />
                    <label class="form-check-label" :for="'check-' + dept.id">
                      {{ index + 1 }}
                    </label>
                  </div>
                </td>

                <td>{{ dept.Department_Name || '-' }}</td>
                <td>{{ dept.Department_Initials || '-' }}</td>

                <td>
                  <!-- EDIT -->
                  <a
                    href="javascript:void(0)"
                    class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center me-1"
                    @click.prevent="openEdit(dept)"
                  >
                    <iconify-icon icon="lucide:edit"></iconify-icon>
                  </a>

                  <!-- DELETE -->
                  <a
                    href="javascript:void(0)"
                    class="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center"
                    @click.prevent="deleteDepartment(dept)"
                  >
                    <iconify-icon icon="mingcute:delete-2-line"></iconify-icon>
                  </a>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-24">
            <span>
              Showing {{ pagination.from || 0 }} to {{ pagination.to || 0 }} of
              {{ pagination.total || 0 }} entries
            </span>
            <ul class="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
              <!-- Prev -->
              <li class="page-item" :class="{ disabled: table.page === 1 }">
                <a
                  class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                  href="javascript:void(0)"
                  @click="table.page > 1 && (table.page -= 1)"
                >
                  <iconify-icon icon="ep:d-arrow-left" class="text-xl"></iconify-icon>
                </a>
              </li>

              <!-- Page numbers -->
              <li v-for="p in pagination.last_page" :key="p" class="page-item">
                <a
                  href="javascript:void(0)"
                  @click="table.page = p"
                  :class="[
                    'page-link fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px',
                    p === table.page
                      ? 'bg-primary-600 text-white'
                      : 'bg-primary-50 text-secondary-light'
                  ]"
                >
                  {{ p }}
                </a>
              </li>

              <!-- Next -->
              <li class="page-item" :class="{ disabled: table.page === pagination.last_page }">
                <a
                  class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                  href="javascript:void(0)"
                  @click="table.page < pagination.last_page && (table.page += 1)"
                >
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
  <transition name="fade-scale" appear>
    <div
      v-if="showEdit"
      class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style="background: rgba(0,0,0,0.5); z-index:1050;"
    >
      <div
        class="bg-white radius-12 shadow p-24"
        style="min-width: 320px; max-width: 480px; width: 100%; position: relative;"
      >
        <!-- Header -->
        <div class="d-flex justify-content-between align-items-start mb-16">
          <div>
            <h5 class="fw-semibold mb-4">Edit Department</h5>
            <small class="text-muted d-block">Update department name and initials</small>
          </div>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            @click="closeEdit"
          ></button>
        </div>

        <!-- Body -->
        <div>
          <div class="mb-16">
            <label class="form-label fw-semibold text-primary-light text-sm mb-8">
              Name <span class="text-danger-600">*</span>
            </label>
            <input
              type="text"
              class="form-control radius-8 w-full"
              v-model="editDepartmentName"
              placeholder="Enter department name"
            />
          </div>

          <div class="mb-16">
            <label class="form-label fw-semibold text-primary-light text-sm mb-8">
              Initials <span class="text-danger-600">*</span>
            </label>
            <input
              type="text"
              class="form-control radius-8 w-full"
              v-model="editDepartmentInitials"
              placeholder="Enter department initials"
            />
          </div>

          <div v-if="errorMessage" class="alert alert-danger py-8 px-12" role="alert">
            {{ errorMessage }}
          </div>
        </div>

        <!-- Footer -->
        <div class="d-flex justify-content-end gap-2 mt-24">
          <button
            type="button"
            class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-24 py-12 radius-8"
            @click="closeEdit"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
            :disabled="savingEdit"
            @click="saveEdit"
          >
            <span v-if="savingEdit">Saving...</span>
            <span v-else>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
