<script setup lang="ts">
import { useNuxtApp } from '#imports';
import { ref, onMounted } from 'vue';
import { useFlashStore } from '~/stores/flashs'
 

const flash = useFlashStore()
const { $axios } = (useNuxtApp() as any);

const Vat = ref<number>(0);
const loading = ref<boolean>(false);
const isSubmitting = ref<boolean>(false);
 



const fetchVat = async (): Promise<void> => {
    loading.value = true;
    try {
        const response = await $axios.get('/api/vat');
        Vat.value = response.data;
   

        console.log('VAT fetched:', Vat.value);

    } catch (error) {
        flash.error('Error fetching VAT'+ error);
    } finally {
        loading.value = false;
    }
};


const updateVat = async (): Promise<void> => {
    isSubmitting.value = true;
    try {
        await $axios.post('/api/vat', {
            Vat: Vat.value
        });
        flash.success('VAT updated successfully.');
        await fetchVat();
    } catch (error) {

        flash.error('Failed to update VAT.');
    } finally {
        isSubmitting.value = false;
    }
};



onMounted(async () => {
    await fetchVat();
});




</script>

<template>
    <div class="dashboard-main-body">

        <div class="row gy-4">
            <div class="col-md-12">

                <div class="card">
                    <div class="card-header">
                        <h6 class="card-title mb-0">Update Vat</h6>
                    </div>
                    <div class="card-body">
                        <form @submit.prevent="updateVat">
                        <div class="row gy-3">
                            <div class="col-12">
                                <label class="form-label">Vat</label>
                                <input type="number" name="#0" class="form-control" v-model="Vat">
                            </div>

                            <div class="col-12">
                                <button type="submit" class="btn btn-primary"  :disabled="isSubmitting">
                                    Update Vat
                                </button>
                            </div>


                        </div>
                        </form> 
                    </div>


                    
                </div><!-- card end -->

            </div>

        </div>
    </div>
</template>