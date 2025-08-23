<script setup lang="ts">
definePageMeta({
  layout: 'login'
})
import { ref, onMounted } from 'vue'
 
const loading = ref<boolean>(false);
const email = ref<string>('');
const password = ref<string>('');
const error = ref<string>('');

const { $axios } = useNuxtApp()

const login = async (): Promise<void> => {

    loading.value = true;
  try {
    
        const res = await $axios.post('/api/login', {
        email: email.value,
        password: password.value
        })

        const token = res.data.token
        localStorage.setItem('token', token)

        const { data: user } = await $axios.get('/api/user')
        
        localStorage.setItem('user', JSON.stringify(user))

        await navigateTo('/admin')

  } catch (err: any) {
    error.value = err.response?.data?.message || 'Login failed'

     console.error('Login error:', err.response?.data?.message || err.message);
  }finally {
    loading.value = false;
  }
}
 
 
</script>

<template>
   <section class="auth bg-base d-flex flex-wrap">
        <div class="auth-left d-lg-block d-none">
            <div class="d-flex align-items-center flex-column h-100 justify-content-center">
                <img src="https://isc-depot.com/uploads/banner/203374356.jpg" alt="">
            </div>
        </div>
        <div class="auth-right py-32 px-24 d-flex flex-column justify-content-center">
            <div class="max-w-464-px mx-auto w-100">
                <div>
                    <a href="#" class="mb-40 max-w-290-px">
                        <img src="https://midnightblue-llama-681520.hostingersite.com/logonew1.jpg" alt="">
                    </a>
                    <h4 class="mb-12">Sign In to your Account</h4>
                    <p class="mb-32 text-secondary-light text-lg">Welcome back! please enter your detail</p>
                </div>
                <form @submit.prevent="login" >
                    <div class="icon-field mb-16">
                        <span class="icon top-50 translate-middle-y">
                            <iconify-icon icon="mage:email"></iconify-icon>
                        </span>
                        <input type="email" v-model="email" class="form-control h-56-px bg-neutral-50 radius-12" placeholder="Email">
                    </div>
                    <div class="position-relative mb-20">
                        <div class="icon-field">
                            <span class="icon top-50 translate-middle-y">
                                <iconify-icon icon="solar:lock-password-outline"></iconify-icon>
                            </span>
                            <input type="password"  v-model="password" class="form-control h-56-px bg-neutral-50 radius-12" id="your-password" placeholder="Password">
                        </div>
                        <span class="toggle-password ri-eye-line cursor-pointer position-absolute end-0 top-50 translate-middle-y me-16 text-secondary-light" data-toggle="#your-password"></span>
                    </div>
                    <div class="">
                        <div class="d-flex justify-content-between gap-2">
                            <div class="form-check style-check d-flex align-items-center">
                                <input class="form-check-input border border-neutral-300" type="checkbox" value="" id="remeber">
                                <label class="form-check-label" for="remeber">Remember me </label>
                            </div>
                            <a href="#" class="text-primary-600 fw-medium">Forgot Password?</a>
                        </div>
                    </div>

                    <button class="btn btn-primary text-sm btn-sm px-12 py-16 w-100 radius-12 mt-32d" :disabled="loading || !password || !email">  
                      
                        <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                         Sign In
                    
                     </button>




                </form>
            </div>
        </div>
    </section>
</template>
