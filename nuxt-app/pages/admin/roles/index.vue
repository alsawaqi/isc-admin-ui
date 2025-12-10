<script lang="ts" setup>

import { ref, onMounted, reactive, watch } from 'vue'
import { useNuxtApp, defineAppConfig, definePageMeta } from '#imports'

const { $axios } = (useNuxtApp() as any);


definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'view roles'
})



interface Role {
  id: number
  name: string
  created_at: string
}



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



const roles = ref<Role[]>([])
const selectedPermissions = ref<string[]>([])
const currentRoleId = ref<number | null>(null)
const rolename = ref<string | null>(null)


const deleterole = async (roleId: number) => {
  try {
    await $axios.delete(`/api/roles/${roleId}`)
    roles.value = roles.value.filter(role => role.id !== roleId)
  } catch (error) {
    console.error('Error deleting role:', error)
  }
}



const openPermissionModal = async (roleId: number, roleNameParam: string) => {
  currentRoleId.value = roleId
  rolename.value = roleNameParam
  const response = await $axios.get(`/api/roles/${roleId}/permissions`);

  selectedPermissions.value = response.data.permissions


}


const allPermissions = [
  'products', 'product category', 'departments', 'sub departments', 'sub sub departments', 'addproductsdescription',
  'product brands', 'product types', 'product manufacture', 'product master', 'product activation', 'product reports',
  'orders', 'orders placed', 'order packaging', 'order dispatched', 'order shipments', 'order delivery', 'order verification',
  'invoice', 'invoice list', 'invoice preview', 'invoice add new',
  'other services', 'free lancers', 'collaborations',
  'admin', 'users', 'add new user', 'view user profile', 'print user profile',
  'define roles', 'assign roles', 'system parameters', 'companies', 'currencies', 'merchant',
  'couriers', 'admin report', 'geography', 'country', 'state', 'city'
]

const toggleAllPermissions = (checkAll: boolean) => {
  selectedPermissions.value = checkAll ? [...allPermissions] : []
}



const updateRolePermissions = async () => {
  try {
    await $axios.post(`/api/roles/${currentRoleId.value}/permissions`, {
      permissions: selectedPermissions.value,
    })

    console.log('Permissions updated successfully')
  } catch (error) {
    console.error('Error updating permissions:', error)
  }
}

const getroles = async () => {
  try {
    const { data } = await $axios.get('/api/roles', {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        sortBy: table.sortBy,
        sortDir: table.sortDir,
      }
    });

    roles.value = data.data;
    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }
  } catch (error) {
    console.error('Error fetching roles:', error)
  }
}



watch(
  () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir],
  async () => {
    await getroles()
  }
)



onMounted(async () => {
  await getroles();

})


</script>
<template>

  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #0ea5e9">Role & Access</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">Role & Access</li>
      </ul>
    </div>

    <div class="card h-100 p-0 radius-12">
      <div
        class="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
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
            <input type="text" class="form-control form-control-sm w-auto" placeholder="Search"
              v-model="table.search" />
            <span class="icon">
              <iconify-icon icon="ion:search-outline"></iconify-icon>
            </span>
          </div>
        </div>
        <button type="button"
          class="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2"
          data-bs-toggle="modal" data-bs-target="#exampleModal">
          <iconify-icon icon="ic:baseline-plus" class="icon text-xl line-height-1"></iconify-icon>
          Add New Role
        </button>
      </div>

      <div class="card-body p-24">
        <div class="table-responsive scroll-sm">
          <table class="table bordered-table sm-table mb-0">
            <thead>
              <tr>
                <th scope="col">
                  <div class="d-flex align-items-center gap-10">
                    <div class="form-check style-check d-flex align-items-center">
                      <input class="form-check-input radius-4 border input-form-dark" type="checkbox" name="checkbox"
                        id="selectAll">
                    </div>
                    S.L
                  </div>
                </th>
                <th scope="col">Create Date</th>
                <th scope="col">Role </th>

                <th scope="col" class="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(role, index) in roles" :key="role.id">
                <td>
                  <div class="d-flex align-items-center gap-10">
                    <div class="form-check style-check d-flex align-items-center">
                      <input class="form-check-input radius-4 border border-neutral-400" type="checkbox"
                        :value="role.id">
                    </div>
                    {{ index + 1 < 10 ? '0' + (index + 1) : index + 1 }} </div>
                </td>
                <td>{{ new Date(role.created_at).toLocaleDateString('en-GB', {
                  day: '2-digit', month: 'short', year:
                  'numeric' }) }}</td>
                <td>{{ role.name }}</td>


                <td class="text-center">
                  <div class="d-flex align-items-center gap-10 justify-content-center">
                    <button type="button"
                      class="bg-success-focus text-success-600 bg-hover-success-200 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                      data-bs-toggle="modal" data-bs-target="#exampleModal"
                      @click.prevent="openPermissionModal(role.id, role.name)">
                      <iconify-icon icon="lucide:edit" class="menu-icon"></iconify-icon>
                    </button>
                    <button type="button"
                      class="remove-item-btn bg-danger-focus bg-hover-danger-200 text-danger-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle">
                      <iconify-icon icon="fluent:delete-24-regular" class="menu-icon"></iconify-icon>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>

          </table>
        </div>

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

  <!-- Modal Start -->
  <div class="modal fade" id="exampleModal" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog modal-dialog-centered">
      <div class="modal-content radius-16 bg-base">
        <div class="modal-header py-16 px-24 border border-top-0 border-start-0 border-end-0">
          <h1 class="modal-title fs-5" id="exampleModalLabel">{{ rolename }}</h1>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body p-24">

          <div class="sidebar-menu-area">

            <input type="checkbox" />
            Select All Permissions

            <ul class="permission-tree-level-0">
              <li><label><input type="checkbox" v-model="selectedPermissions" value="products"> Products</label>
                <ul class="permission-tree-level-1">
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="product category"> Product
                      Category</label>
                    <ul class="permission-tree-level-2">
                      <li><label><input type="checkbox" v-model="selectedPermissions" value="departments">
                          Departments</label></li>
                      <li><label><input type="checkbox" v-model="selectedPermissions" value="sub departments"> Sub
                          Departments</label></li>
                      <li><label><input type="checkbox" v-model="selectedPermissions" value="sub sub departments"> Sub
                          Sub Departments</label></li>
                      <li><label><input type="checkbox" v-model="selectedPermissions" value="addproductsdescription">
                          Products Features</label></li>
                    </ul>
                  </li>


                  <li><label><input type="checkbox" v-model="selectedPermissions" value="product types"> Product
                      Types</label></li>
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="product brands"> Product
                      Brands</label></li>
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="product manufacture"> Product
                      Manufacture</label></li>
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="product master"> Product
                      Master</label></li>
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="product activation"> Product
                      Activation</label></li>
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="product reports"> Product
                      Reports</label></li>
                </ul>
              </li>
              <li><label><input type="checkbox" v-model="selectedPermissions" value="orders"> Orders</label>
                <ul class="permission-tree-level-1">
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="orders placed"> Orders
                      Placed</label></li>
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="order packaging"> Order
                      Packaging</label></li>
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="order dispatched"> Order
                      Dispatched</label></li>
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="order shipments"> Order
                      Shipments</label></li>
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="order delivery"> Order
                      Delivery</label></li>
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="order verification"> Order
                      Verification</label></li>
                </ul>
              </li>
              <li><label><input type="checkbox" v-model="selectedPermissions" value="invoice"> Invoice</label>
                <ul class="permission-tree-level-1">
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="invoice list"> List</label>
                  </li>
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="invoice preview">
                      Preview</label></li>
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="invoice add new"> Add
                      New</label></li>
                </ul>
              </li>
              <li><label><input type="checkbox" v-model="selectedPermissions" value="other services"> Other
                  Services</label>
                <ul class="permission-tree-level-1">
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="free lancers"> Free
                      Lancers</label></li>
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="collaborations">
                      Collaborations</label></li>
                </ul>
              </li>
              <li><label><input type="checkbox" v-model="selectedPermissions" value="admin"> Admin</label>
                <ul class="permission-tree-level-1">
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="users"> User</label>
                    <ul class="permission-tree-level-2">
                      <li><label><input type="checkbox" v-model="selectedPermissions" value="add new user"> Add New
                          User</label></li>
                      <li><label><input type="checkbox" v-model="selectedPermissions" value="view user profile"> View
                          User Profile</label></li>
                      <li><label><input type="checkbox" v-model="selectedPermissions" value="print user profile"> Print
                          User Profile</label></li>
                      <li><label><input type="checkbox" v-model="selectedPermissions" value="define roles"> Define
                          Roles</label></li>
                      <li><label><input type="checkbox" v-model="selectedPermissions" value="assign roles"> Assign
                          Roles</label></li>
                    </ul>
                  </li>

                  <li><label><input type="checkbox" v-model="selectedPermissions" value="geography"> Geography</label>
                    <ul class="permission-tree-level-2">
                      <li><label><input type="checkbox" v-model="selectedPermissions" value="country"> country</label>
                      </li>
                      <li><label><input type="checkbox" v-model="selectedPermissions" value="state"> state</label></li>
                      <li><label><input type="checkbox" v-model="selectedPermissions" value="city"> city</label></li>
                    </ul>
                  </li>
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="system parameters"> System
                      Parameters</label></li>
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="companies"> Companies</label>
                  </li>
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="currencies"> Currencies</label>
                  </li>
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="merchant"> Merchant</label>
                  </li>
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="couriers"> Couriers</label>
                  </li>
                  <li><label><input type="checkbox" v-model="selectedPermissions" value="admin report"> Admin
                      Report</label></li>
                </ul>
              </li>
            </ul>
            <button @click="updateRolePermissions" class="btn btn-primary">
              Save Permissions
            </button>
          </div>



        </div>
      </div>
    </div>
  </div>
  <!-- Modal End -->
</template>