<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useNuxtApp,definePageMeta } from '#imports'

const  { $axios } = (useNuxtApp() as any);

definePageMeta({
     layout: 'admin',
     middleware: ['permission'],
     permissions: 'add new users'

    });




 const form = ref({
  User_Name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: ''
});

interface Role {
  id: number | string
  name: string
}

const roles = ref<Role[]>([]);

const fetchRoles = async () => {
  try {
    const response = await $axios.get('/api/roles/all')
    roles.value = response.data
  } catch (error) {
    console.error('Failed to load roles:', error)
  }
}

const submitForm = async (e: Event) => {
     e.preventDefault();
  try {
    // Add validation logic here if needed
    await $axios.post('/api/users', form.value);

    form.value = {
      User_Name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: ''
    }
   
  } catch (error) {
    alert('Failed to create user:'+ error)
  }
}

onMounted(async () => {
  await fetchRoles();
});
</script>
<template>

    <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 class="fw-semibold mb-0" style="color: #6366f1">Add User</h6>
        <ul class="d-flex align-items-center gap-2">
            <li class="fw-medium">
                <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
                    <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                    Dashboard
                </a> 
            </li>
            <li>-</li>
            <li class="fw-medium" >Add User</li>
        </ul>
    </div>

    <div class="card h-100 p-0 radius-12">
        <div class="card-body p-24">
            <div class="row justify-content-center">
                <div class="col-xxl-6 col-xl-8 col-lg-10">
                    <div class="card border">
                        <div class="card-body">
                            <h6 class="text-md text-primary-light mb-16" >Create Admin User</h6>

                            
                        
                          <form @submit.prevent="submitForm">
                              <div class="mb-20">
                                <label for="name" class="form-label">Full Name <span class="text-danger-600">*</span></label>
                                <input v-model="form.User_Name" type="text" class="form-control radius-8" id="name" placeholder="Enter Full Name">
                              </div>

                              <div class="mb-20">
                                <label for="email" class="form-label">Email <span class="text-danger-600">*</span></label>
                                <input v-model="form.email" type="email" class="form-control radius-8" id="email" placeholder="Enter email address">
                              </div>

                              <div class="mb-20">
                                <label for="password" class="form-label">Password <span class="text-danger-600">*</span></label>
                                <input v-model="form.password" type="password" class="form-control radius-8" id="password" placeholder="Enter password">
                              </div>

                              <div class="mb-20">
                                <label for="confirmPassword" class="form-label">Confirm Password <span class="text-danger-600">*</span></label>
                                <input v-model="form.confirmPassword" type="password" class="form-control radius-8" id="confirmPassword" placeholder="Confirm password">
                              </div>

                              <div class="mb-20">
                                <label for="role" class="form-label">Select Role <span class="text-danger-600">*</span></label>
                                <select v-model="form.role" class="form-control radius-8 form-select" id="role">
                                  <option value="" disabled>Select a role</option>
                                  <option v-for="role in roles" :key="role.id" :value="role.name">
                                    {{ role.name }}
                                  </option>
                                </select>
                              </div>

                              <div class="d-flex align-items-center justify-content-center gap-3">
                                <button type="button" class="border border-danger-600 text-danger-600 px-56 py-11 radius-8">Cancel</button>
                                <button type="submit" class="btn btn-primary border border-primary-600 px-56 py-12 radius-8">Save</button>
                              </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

</template>