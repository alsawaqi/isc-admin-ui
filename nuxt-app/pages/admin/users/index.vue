<script setup lang="ts">
definePageMeta({
    layout: 'admin',
    middleware: ['permission'],
    permissions: 'role & access'
})


import { ref, onMounted } from 'vue'
const { $axios } = useNuxtApp()

interface Role {
  id: number
  name: string
}

interface User {
  id: number
  User_Name: string
  email: string
  role: string
  roles: Role[]
}

const users = ref<User[]>([])
const roles = ref<Role[]>([])


const getuser =async ()=>{
     try{
          const res = await $axios.get('/api/users-with-roles')
    users.value = res.data;

     }catch(error) {
        console.error('Error fetching users:', error)

     }
}

const getRoles = async () => {
  try {
    const res = await $axios.get('/api/roles')
    roles.value = res.data
  } catch (error) {
    console.error('Error fetching roles:', error)
  }
} 

const assignRole = async (userId: number, roleId: number) => {
  try {
    await $axios.post('/api/assign-role', {
      user_id: userId,
      role_id: roleId
    })

    await getuser(); // Refresh the user list after assigning the role
  
} catch (error) {
    console.error('Error assigning role:', error)
  }
}
onMounted(async () => {
     await getuser();
     await getRoles();
})

</script>
<template>
    <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 class="fw-semibold mb-0">Role & Access</h6>
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
                            <th scope="col">Username</th>
                            <th scope="col">Email</th>
                            <th scope="col" class="text-center">Role Permission</th>
                            <th scope="col" class="text-center">Action</th>
                        </tr>
                    </thead>
                       <tbody>
                        <tr v-for="(user, index) in users" :key="user.id">
                            <td>
                                <div class="d-flex align-items-center gap-10">
                                    <div class="form-check style-check d-flex align-items-center">
                                        <input class="form-check-input radius-4 border input-form-dark" type="checkbox" :id="'user-' + user.id">
                                    </div>
                                    <span class="text-secondary-light">{{ index + 1 }}</span>
                                </div>
                            </td>
                            <td>
                                <div class="d-flex align-items-center gap-10">
                                   
                                    <span class="text-secondary-light">{{ user.User_Name }}</span>
                                </div>
                            </td>

                            <td>
                                <span class="text-secondary-light">{{ user.email }}</span>
                            </td>
                            <td class="text-center">
                            <p v-for="role in user.roles" :key="role.id" :value="role.name">{{ role.name }}</p>
                            </td>
                            <td class="text-center">
                            <div class="dropdown">
                                <button class="btn btn-outline-primary-600 not-active px-18 py-11 dropdown-toggle toggle-icon"
                                        type="button" data-bs-toggle="dropdown">
                                Assign Role
                                </button>
                                <ul class="dropdown-menu">
                                <li v-for="role in roles" :key="role.id">
                                    <a class="dropdown-item px-16 py-8 rounded text-secondary-light bg-hover-neutral-200 text-hover-neutral-900"
                                    href="javascript:void(0)"
                                    @click.prevent="assignRole(user.id, role.id)">
                                    {{ role.name }}
                                    </a>
                                </li>
                                </ul>
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

</template>