<script setup lang="ts">
  import  {definePageMeta, useNuxtApp } from  '#imports'
  import  { ref, onMounted,watch,computed } from 'vue'
  
  definePageMeta({
     layout: 'admin'
    })


const loading = ref<boolean>(false);
const roleName = ref<string>('')
const selectedPermissions = ref<string[]>([])
const { $axios } = (useNuxtApp() as any);


const allPermissions = [
  // Products
  'products', 'product category', 'departments', 'sub departments', 'sub sub departments', 'addproductsdescription',
  'product brands', 'product types','product manufacture', 'product master', 'product activation', 'product reports',

  // Orders
  'orders', 'orders placed', 'order packaging', 'order dispatched', 'order shipments', 'order delivery', 'order verification',

  // Invoice
  'invoice', 'invoice list', 'invoice preview', 'invoice add new',

  // Other Services
  'other services', 'free lancers', 'collaborations',

  // Admin
  'admin', 'users', 'add new user',  'geography','country','state','city','view user profile', 'print user profile',
  'define roles', 'assign roles', 'system parameters', 'companies', 'currencies',
  'merchant', 'couriers', 'admin report',
]

// Define the parent-to-children relationships
const permissionTree: Record<string, string[]> = {
  products: [
    'product types',
    'product category',
    'product brands',
    'product manufacture',
    'product master',
    'product activation',
    'product reports',
  ],
  'product category': ['departments', 'sub departments', 'sub sub departments','addproductsdescription',],
  orders: [
    'orders placed',
    'order packaging',
    'order dispatched',
    'order shipments',
    'order delivery',
    'order verification',
  ],
  invoice: ['invoice list', 'invoice preview', 'invoice add new'],
  'other services': ['free lancers', 'collaborations'],
  admin: [
    'users',
    'system parameters',
    'companies',
    'currencies',
    'merchant',
    'couriers',
    'admin report',
  ],
  users: [
    'add new user',
    'view user profile',
    'print user profile',
    'define roles',
    'assign roles',
  ],
 geography: [
    'country',
    'state',
    'city',
  ]
}

// Watcher: When a parent is added/removed, cascade to children
watch(
  selectedPermissions,
  (newVal, oldVal) => {
    for (const parent in permissionTree) {
      const children = permissionTree[parent]

      const wasSelected = oldVal.includes(parent)
      const isSelected = newVal.includes(parent)

      if (!wasSelected && isSelected) {
        // Add children when parent is selected
        children.forEach(child => {
          if (!selectedPermissions.value.includes(child)) {
            selectedPermissions.value.push(child)
          }
        })
      }

      if (wasSelected && !isSelected) {
        // Remove children when parent is deselected
        selectedPermissions.value = selectedPermissions.value.filter(
          perm => !children.includes(perm)
        )
      }
    }
  },
  { deep: true }
)


const isAllSelected = computed(() => selectedPermissions.value.length === allPermissions.length)

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedPermissions.value = []
  } else {
    selectedPermissions.value = [...allPermissions]
  }
}

const createRole = async () => {
  try {
    const response = await $axios.post('/api/roles', {
      name: roleName.value,
      permissions: selectedPermissions.value
    })

    alert('Role created successfully!')
    roleName.value = ''
    selectedPermissions.value = []
  } catch (error: any) {
    console.error(error)
    alert('Failed to create role')
  }
}

onMounted(() => {
  document.querySelectorAll('.permission-tree li.permission-branch > label').forEach(label => {
    label.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).tagName.toLowerCase() === 'input') return // don't toggle if checkbox clicked
      const li = label.parentElement
      li?.classList.toggle('open')
      const submenu = li?.querySelector('ul')
      if (submenu) submenu.style.display = submenu.style.display === 'block' ? 'none' : 'block'
    })
  })
})

    </script>


<template>
<div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 class="fw-semibold mb-0" style="color: #f43f5e">Permission</h6>
        <ul class="d-flex align-items-center gap-2">
            <li class="fw-medium">
                <NuxtLink :to="'/admin'" class="d-flex align-items-center gap-1 hover-text-primary">
                    <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                    Dashboard
                </NuxtLink>
            </li>
            <li>-</li>
            <li class="fw-medium">Permission</li>
        </ul>
    </div>



    <div class="card h-100 p-0 radius-12 overflow-hidden">
        <div class="card-body p-40">
            <form @submit.prevent="createRole">
                <div class="row">

                    <div class="col-sm-12">
                        <div class="mb-20">
                            <label for="address" class="form-label fw-semibold text-primary-light text-sm mb-8"> Name <span class="text-danger-600">*</span></label>
                            <input type="text"  v-model="roleName" class="form-control radius-8" id="address" placeholder="Enter Your Name" required>
                        </div>


                        <div class="mb-20">

                            <div class="card h-100 p-0">
                                <div class="card-header border-bottom bg-base py-16 px-24">
                                    <h6 class="text-lg fw-semibold mb-0">Permissions</h6>
                                </div>
                              <div class="card-body p-24">
                                <div class="sidebar-menu-area">

                                      <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll">
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

                                                    <li><label><input type="checkbox" v-model="selectedPermissions" value="geography"> Geography</label>
                                                      <ul class="permission-tree-level-2">
                                                        <li><label><input type="checkbox" v-model="selectedPermissions" value="country"> country</label></li>
                                                        <li><label><input type="checkbox" v-model="selectedPermissions" value="state"> state</label></li>
                                                        <li><label><input type="checkbox" v-model="selectedPermissions" value="city"> city</label></li>
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
                                 </div>
                                </div>
                              </div>

                          



                        </div>
                    </div>
                    <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
                        <button type="reset" class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8">
                            Reset
                        </button>
                        <button type="submit" 
                                class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8" 
                                 >
                            
                              <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                       
 
                            Save Change
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>


</div>
</template>