<script lang="ts" setup>
  const { $axios } = useNuxtApp();
 

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
  'products', 'product category', 'departments', 'sub departments', 'sub sub departments','addproductsdescription',
  'product brands','product types', 'product manufacture', 'product master', 'product activation', 'product reports',
  'orders', 'orders placed', 'order packaging', 'order dispatched', 'order shipments', 'order delivery', 'order verification',
  'invoice', 'invoice list', 'invoice preview', 'invoice add new',
  'other services', 'free lancers', 'collaborations',
  'admin', 'users', 'add new user', 'view user profile', 'print user profile',
  'define roles', 'assign roles', 'system parameters', 'companies', 'currencies', 'merchant',
  'couriers', 'admin report'
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
 

onMounted(async () => {
  
  try {
    const response = await $axios.get('/api/roles')
    roles.value = response.data
  } catch (error) {
    console.error('Error fetching roles:', error)
  }
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
        <div class="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
            <div class="d-flex align-items-center flex-wrap gap-3">
                <span class="text-md fw-medium text-secondary-light mb-0">Show</span>
                <select class="form-select form-select-sm w-auto ps-12 py-6 radius-12 h-40-px">
                    <option>1</option>
                    <option>2</option>
                    <option>3</option>
                    <option>4</option>
                    <option>5</option>
                    <option>6</option>
                    <option>7</option>
                    <option>8</option>
                    <option>9</option>
                    <option>10</option>
                </select>
                <form class="navbar-search">
                    <input type="text" class="bg-base h-40-px w-auto" name="search" placeholder="Search">
                    <iconify-icon icon="ion:search-outline" class="icon"></iconify-icon>
                </form>
                <select class="form-select form-select-sm w-auto ps-12 py-6 radius-12 h-40-px">
                    <option>Status</option>
                    <option>Active</option>
                    <option>Inactive</option>
                </select>
            </div>
            <button type="button" class="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2" data-bs-toggle="modal" data-bs-target="#exampleModal">
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
                                        <input class="form-check-input radius-4 border input-form-dark" type="checkbox" name="checkbox" id="selectAll">
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
          <input class="form-check-input radius-4 border border-neutral-400" type="checkbox" :value="role.id">
        </div>
        {{ index + 1 < 10 ? '0' + (index + 1) : index + 1 }}
      </div>
    </td>
    <td>{{ new Date(role.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }}</td>
    <td>{{ role.name }}</td>
   
    
    <td class="text-center">
      <div class="d-flex align-items-center gap-10 justify-content-center">
       <button
            type="button"
            class="bg-success-focus text-success-600 bg-hover-success-200 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
            data-bs-toggle="modal" data-bs-target="#exampleModal"
            @click.prevent="openPermissionModal(role.id, role.name)"
            >
  <iconify-icon icon="lucide:edit" class="menu-icon"></iconify-icon>
</button>
        <button type="button" class="remove-item-btn bg-danger-focus bg-hover-danger-200 text-danger-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle">
          <iconify-icon icon="fluent:delete-24-regular" class="menu-icon"></iconify-icon>
        </button>
      </div>
    </td>
  </tr>
</tbody>

                </table>
            </div>

            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-24">
                <span>Showing 1 to 10 of 12 entries</span>
                <ul class="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
                    <li class="page-item">
                        <a class="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md" href="javascript:void(0)">
                            <iconify-icon icon="ep:d-arrow-left" class=""></iconify-icon>
                        </a>
                    </li>
                    <li class="page-item">
                        <a class="page-link text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md bg-primary-600 text-white" href="javascript:void(0)">1</a>
                    </li>
                    <li class="page-item">
                        <a class="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px" href="javascript:void(0)">2</a>
                    </li>
                    <li class="page-item">
                        <a class="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md" href="javascript:void(0)">3</a>
                    </li>
                    <li class="page-item">
                        <a class="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md" href="javascript:void(0)">4</a>
                    </li>
                    <li class="page-item">
                        <a class="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md" href="javascript:void(0)">5</a>
                    </li>
                    <li class="page-item">
                        <a class="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md" href="javascript:void(0)">
                            <iconify-icon icon="ep:d-arrow-right" class=""></iconify-icon>
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

                                      <input
                                            type="checkbox"
                                             
                                          />
                                          Select All Permissions

                                          <ul class="permission-tree-level-0">
                                              <li><label><input type="checkbox" v-model="selectedPermissions" value="products"> Products</label>
                                                <ul class="permission-tree-level-1">
                                                  <li><label><input type="checkbox" v-model="selectedPermissions" value="product category"> Product Category</label>
                                                    <ul class="permission-tree-level-2">
                                                      <li><label><input type="checkbox" v-model="selectedPermissions" value="departments"> Departments</label></li>
                                                      <li><label><input type="checkbox" v-model="selectedPermissions" value="sub departments"> Sub Departments</label></li>
                                                      <li><label><input type="checkbox" v-model="selectedPermissions" value="sub sub departments"> Sub Sub Departments</label></li>
                                                      <li><label><input type="checkbox" v-model="selectedPermissions" value="addproductsdescription"> Products Features</label></li>
                                                    </ul>
                                                  </li>

                                          
                                                  <li><label><input type="checkbox" v-model="selectedPermissions" value="product types"> Product Types</label></li>
                                                  <li><label><input type="checkbox" v-model="selectedPermissions" value="product brands"> Product Brands</label></li>
                                                  <li><label><input type="checkbox" v-model="selectedPermissions" value="product manufacture"> Product Manufacture</label></li>
                                                  <li><label><input type="checkbox" v-model="selectedPermissions" value="product master"> Product Master</label></li>
                                                  <li><label><input type="checkbox" v-model="selectedPermissions" value="product activation"> Product Activation</label></li>
                                                  <li><label><input type="checkbox" v-model="selectedPermissions" value="product reports"> Product Reports</label></li>
                                                </ul>
                                              </li>
                                              <li><label><input type="checkbox" v-model="selectedPermissions" value="orders"> Orders</label>
                                                <ul class="permission-tree-level-1">
                                                  <li><label><input type="checkbox" v-model="selectedPermissions" value="orders placed"> Orders Placed</label></li>
                                                  <li><label><input type="checkbox" v-model="selectedPermissions" value="order packaging"> Order Packaging</label></li>
                                                  <li><label><input type="checkbox" v-model="selectedPermissions" value="order dispatched"> Order Dispatched</label></li>
                                                  <li><label><input type="checkbox" v-model="selectedPermissions" value="order shipments"> Order Shipments</label></li>
                                                  <li><label><input type="checkbox" v-model="selectedPermissions" value="order delivery"> Order Delivery</label></li>
                                                  <li><label><input type="checkbox" v-model="selectedPermissions" value="order verification"> Order Verification</label></li>
                                                </ul>
                                              </li>
                                              <li><label><input type="checkbox" v-model="selectedPermissions" value="invoice"> Invoice</label>
                                                  <ul class="permission-tree-level-1">
                                                    <li><label><input type="checkbox" v-model="selectedPermissions" value="invoice list"> List</label></li>
                                                    <li><label><input type="checkbox" v-model="selectedPermissions" value="invoice preview"> Preview</label></li>
                                                    <li><label><input type="checkbox" v-model="selectedPermissions" value="invoice add new"> Add New</label></li>
                                                  </ul>
                                              </li>
                                                <li><label><input type="checkbox" v-model="selectedPermissions" value="other services"> Other Services</label>
                                                  <ul class="permission-tree-level-1">
                                                    <li><label><input type="checkbox" v-model="selectedPermissions" value="free lancers"> Free Lancers</label></li>
                                                    <li><label><input type="checkbox" v-model="selectedPermissions" value="collaborations"> Collaborations</label></li>
                                                  </ul>
                                                </li>
                                                <li><label><input type="checkbox" v-model="selectedPermissions" value="admin"> Admin</label>
                                                  <ul class="permission-tree-level-1">
                                                    <li><label><input type="checkbox" v-model="selectedPermissions" value="users"> User</label>
                                                      <ul class="permission-tree-level-2">
                                                        <li><label><input type="checkbox" v-model="selectedPermissions" value="add new user"> Add New User</label></li>
                                                        <li><label><input type="checkbox" v-model="selectedPermissions" value="view user profile"> View User Profile</label></li>
                                                        <li><label><input type="checkbox" v-model="selectedPermissions" value="print user profile"> Print User Profile</label></li>
                                                        <li><label><input type="checkbox" v-model="selectedPermissions" value="define roles"> Define Roles</label></li>
                                                        <li><label><input type="checkbox" v-model="selectedPermissions" value="assign roles"> Assign Roles</label></li>
                                                      </ul>
                                                    </li>
                                                    <li><label><input type="checkbox" v-model="selectedPermissions" value="system parameters"> System Parameters</label></li>
                                                    <li><label><input type="checkbox" v-model="selectedPermissions" value="companies"> Companies</label></li>
                                                    <li><label><input type="checkbox" v-model="selectedPermissions" value="currencies"> Currencies</label></li>
                                                    <li><label><input type="checkbox" v-model="selectedPermissions" value="merchant"> Merchant</label></li>
                                                    <li><label><input type="checkbox" v-model="selectedPermissions" value="couriers"> Couriers</label></li>
                                                    <li><label><input type="checkbox" v-model="selectedPermissions" value="admin report"> Admin Report</label></li>
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