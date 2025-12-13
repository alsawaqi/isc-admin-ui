<script setup lang="ts">
import { ref, onMounted, reactive, watch } from 'vue'
import { definePageMeta, useNuxtApp } from '#imports'
import { useFlashStore } from '~/stores/flashs'
const flash = useFlashStore()


definePageMeta({
    layout: 'admin',
    middleware: ['permission'],
    permissions: 'View Users'
})

const { $axios } = (useNuxtApp() as any);

interface Role {
    id: number
    name: string
}

interface User {
    id: number
    User_Name: string
    Email: string
    role: string
    roles: Role[]
    No_Login?: number | string
}



const table = reactive({
    page: 1,
    perPage: 4,
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



const users = ref<User[]>([])
const roles = ref<Role[]>([])
// --- Change password modal state ---
const showPasswordModal = ref(false)
const selectedUser = ref<User | null>(null)
const newPassword = ref<string>('')
const confirmPassword = ref<string>('')
const passwordError = ref<string>('')
const passwordLoading = ref<boolean>(false)

const openPasswordModal = (user: User) => {
    selectedUser.value = user
    newPassword.value = ''
    confirmPassword.value = ''
    passwordError.value = ''
    showPasswordModal.value = true
}

const closePasswordModal = () => {
    showPasswordModal.value = false
    selectedUser.value = null
    newPassword.value = ''
    confirmPassword.value = ''
    passwordError.value = ''
}

const changePassword = async () => {
    if (!selectedUser.value) return

    // basic client validation
    if (!newPassword.value || newPassword.value.length < 8) {
        passwordError.value = 'Password must be at least 8 characters.'
        return
    }

    if (newPassword.value !== confirmPassword.value) {
        passwordError.value = 'Passwords do not match.'
        return
    }

    try {
        passwordLoading.value = true
        passwordError.value = ''

        await $axios.post(`/api/users/${selectedUser.value.id}/change-password`, {
            password: newPassword.value,
        })

        flash.success('Password changed successfully.')
        closePasswordModal()
    } catch (error: any) {
        flash.error('Error changing password:', error)
        passwordError.value =
            error?.response?.data?.message || 'Failed to change password.'
    } finally {
        passwordLoading.value = false
    }
}



const getuser = async () => {
    try {
        const { data } = await $axios.get('/api/users-with-roles', {
            params: {
                page: table.page,
                per_page: table.perPage,
                search: table.search,
                sort_by: table.sortBy,
                sort_dir: table.sortDir,
            },
        })

        users.value = data.data;
        pagination.value = {
            total: data.total,
            from: data.from,
            to: data.to,
            last_page: data.last_page,
        }


    } catch (error: any) {
        flash.error('Error fetching users.')

    }
}

const getRoles = async () => {
    try {
        const res = await $axios.get('/api/roles/all')
        roles.value = res.data
    } catch (error) {
        flash.error('Error fetching roles.')
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



const blocking = ref<number | null>(null) // which user is being processed

const blockUser = async (userId: number) => {
 const ok = await flash.confirm({
    title: 'Block User?',
    message: `Are you sure you want to Block this user?.`,
    confirmText: 'Yes, block',
    cancelText: 'No, cancel',
  })
  if (!ok) return;

    try {
        blocking.value = userId
        await $axios.post(`/api/users/${userId}/block`) // 👈 adjust URL if needed
        flash.success('User blocked successfully.')
        await getuser() // refresh list
    } catch (error) {
        console.error('Error blocking user:', error)
        flash.error('Failed to block user')
    } finally {
        blocking.value = null
    }
}

const unblockUser = async (userId: number) => {
    const ok = await flash.confirm({
    title: 'Un Block User?',
    message: `Are you sure you want to Un Block this user?.`,
    confirmText: 'Yes, unblock',
    cancelText: 'No, cancel',
  })
  if (!ok) return;

    try {
        blocking.value = userId
        await $axios.post(`/api/users/${userId}/unblock`) // 👈 adjust URL if needed
        flash.success('User unblocked successfully.')
        await getuser()
    } catch (error) {
        console.error('Error unblocking user:', error)
        flash.error('Failed to unblock user')
    } finally {
        blocking.value = null
    }
}



watch(
    () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir],
    async () => {
        await getuser()
    }
)

onMounted(async () => {
    await getuser();
    await getRoles();
})

</script>
<template>
    <div class="dashboard-main-body">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
            <h6 class="fw-semibold mb-0" style="color: #22c55e">View Users</h6>
            <ul class="d-flex align-items-center gap-2">
                <li class="fw-medium">
                    <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
                        <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                        Dashboard
                    </a>
                </li>
                <li>-</li>
                <li class="fw-medium">View Users</li>
            </ul>
        </div>

        <div class="card h-100 p-0 radius-12">
            <div
                class="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
                <div class="d-flex align-items-center flex-wrap gap-3">
                    <span class="text-md fw-medium text-secondary-light mb-0">Show</span>
                    <select v-model.number="table.perPage" class="form-select form-select-sm w-auto">
                        <option :value="10">10</option>
                        <option :value="15">15</option>
                        <option :value="20">20</option>
                    </select>
                    <div class="navbar-search">
                        <input type="text" v-model="table.search" class="bg-base h-40-px w-auto" name="search"
                            placeholder="Search">
                        <iconify-icon icon="ion:search-outline" class="icon"></iconify-icon>
                    </div>

                </div>
            </div>

            <div class="card-body p-24">
                <div class="table-responsive scroll-sm">
                    <table class="table bordered-table sm-table mb-0">
                        <thead>
                            <tr>
                                <th scope="col">
                                    <div class="d-flex align-items-center gap-10">
                                        <!-- <div class="form-check style-check d-flex align-items-center">
                                        <input class="form-check-input radius-4 border input-form-dark" type="checkbox" name="checkbox" id="selectAll">
                                    </div> -->
                                        S.L
                                    </div>
                                </th>
                                <th scope="col">Username</th>
                                <th scope="col">Email</th>
                                <th scope="col" class="text-center">Role Permission</th>
                                <th scope="col" class="text-center">Assign Role</th>
                                <th scope="col" class="text-center">Action</th>
                                <th scope="col" class="text-center">Change Password</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(user, index) in users" :key="user.id">
                                <td>
                                    <div class="d-flex align-items-center gap-10">
                                        <!-- <div class="form-check style-check d-flex align-items-center">
                                        <input class="form-check-input radius-4 border input-form-dark" type="checkbox" :id="'user-' + user.id">
                                    </div> -->
                                        <span class="text-secondary-light">{{ index + 1 }}</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="d-flex align-items-center gap-10">

                                        <span class="text-secondary-light">{{ user.User_Name }} </span>
                                    </div>
                                </td>

                                <td>
                                    <span class="text-secondary-light">{{ user.Email }}</span>
                                </td>
                                <td class="text-center">

                                    <p v-for="role in user?.roles" :key="role?.id" :value="role.name">{{ role.name }}
                                    </p>
                                </td>
                                <td class="text-center">
                                    <div class="dropdown">
                                        <button
                                            class="btn btn-outline-primary-600 not-active px-18 py-11 dropdown-toggle toggle-icon"
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

                                <td>
                                    <button type="button" class="btn btn-sm"
                                        :class="user.No_Login === '1.0' ? 'btn-success' : 'btn-danger'"
                                        :disabled="blocking === user.id"
                                        @click="user.No_Login === '1.0' ? unblockUser(user.id) : blockUser(user.id)">
                                        <span v-if="blocking === user.id" class="spinner-border spinner-border-sm me-1"
                                            role="status" aria-hidden="true"></span>
                                        {{ user.No_Login === '1.0' ? 'Unblock' : 'Block' }}
                                    </button>
                                </td>

                                <td>

                                    <!-- 🔐 Change Password -->
                                    <button type="button" class="btn btn-sm btn-outline-warning"
                                        @click="openPasswordModal(user)">
                                        Change Password
                                    </button>

                                </td>

                            </tr>

                        </tbody>
                    </table>
                </div>

                <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-24">
                    <span>
                        Showing {{ pagination.from || 0 }} to {{ pagination.to || 0 }} of {{ pagination.total || 0
                        }} entries
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
                                href="javascript:void(0)"
                                @click="table.page < pagination.last_page && (table.page += 1)">
                                <iconify-icon icon="ep:d-arrow-right" class="text-xl"></iconify-icon>
                            </a>
                        </li>
                    </ul>

                </div>
            </div>
        </div>
        <!-- Change Password Modal -->
        <div v-if="showPasswordModal" class="modal fade show d-block" tabindex="-1"
            style="background: rgba(0, 0, 0, 0.5);" @click.self="closePasswordModal">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            Change Password
                            <span v-if="selectedUser" class="text-muted">
                                – {{ selectedUser.User_Name }}
                            </span>
                        </h5>
                        <button type="button" class="btn-close" @click="closePasswordModal"></button>
                    </div>

                    <div class="modal-body">
                        <div v-if="passwordError" class="alert alert-danger py-2 px-3 mb-3">
                            {{ passwordError }}
                        </div>

                        <div class="mb-3">
                            <label class="form-label">New Password</label>
                            <input type="password" v-model="newPassword" class="form-control"
                                placeholder="Enter new password" />
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Confirm Password</label>
                            <input type="password" v-model="confirmPassword" class="form-control"
                                placeholder="Re-enter new password" />
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" @click="closePasswordModal"
                            :disabled="passwordLoading">
                            Close
                        </button>
                        <button type="button" class="btn btn-primary" @click="changePassword"
                            :disabled="passwordLoading">
                            <span v-if="passwordLoading" class="spinner-border spinner-border-sm me-1" role="status"
                                aria-hidden="true"></span>
                            Save Password
                        </button>
                    </div>
                </div>
            </div>
        </div>

    </div>

</template>