<script setup lang="ts">
import { definePageMeta } from '#imports'
import { ref } from 'vue'
import Loyality from '~/components/systemparameters/loyality.vue'
import Vat from '~/components/systemparameters/vat.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permissions: 'shipping.shippers'
})

 
const change = ref<string>('loyality');


const changeRoute = (newRoute: string) => {
    change.value = newRoute;
};  

</script>
<template>

       <div class="dashboard-main-body">

            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
                <h6 class="fw-semibold mb-0">System Parameters</h6>
                <ul class="d-flex align-items-center gap-2">
                    <li class="fw-medium">
                        <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
                            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                            Dashboard
                        </a>
                    </li>
                    <li>-</li>
                    <li class="fw-medium">System Parameters</li>
                </ul>
            </div>

            <div class="row gy-4">
                <div class="col-xxl-3">
                    <div class="card h-100 p-0">
                        <div class="card-body p-24">
                            <button type="button" :class="'btn  text-sm btn-sm px-12 py-12 w-100 radius-8 d-flex align-items-center gap-2 mb-16'
                                                        + (change === 'loyality' ? ' btn-primary' : ' btn-outline-secondary')"
                                                           @click="changeRoute('loyality')">
                              
                                Loyality
                            </button>


                             <button type="button" :class="'btn  text-sm btn-sm px-12 py-12 w-100 radius-8 d-flex align-items-center gap-2 mb-16'
                                + (change === 'vat' ? ' btn-primary' : ' btn-outline-secondary')"
                                                           @click="changeRoute('vat')">
                               
                                Vat
                            </button>

                           

                        </div>
                    </div>
                </div>
                <div class="col-xxl-9">
                    <div class="card h-100 p-0 email-card">

                        <div class="card-body p-0">
                            <Loyality v-if="change === 'loyality'" />
                            <Vat v-else-if="change === 'vat'" />
                        </div>
                        
                         
                    </div>
                </div>
            </div>
        </div>
</template>