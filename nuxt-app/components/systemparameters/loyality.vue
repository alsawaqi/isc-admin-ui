<script setup lang="ts">
import { useNuxtApp } from '#imports';
import { ref, onMounted } from 'vue';
import { useFlashStore } from '~/stores/flashs'

interface LoyalityHistory {
    id: number;
    Current_Point: number;
    Previous_Point: number;
    created_at: string;
}

const flash = useFlashStore()
const { $axios } = (useNuxtApp() as any);

const points = ref<number>(0);
const loading = ref<boolean>(false);
const isSubmitting = ref<boolean>(false);
const points_history = ref<LoyalityHistory[]>([]);



const fetchLoyalityPoints = async (): Promise<void> => {
    loading.value = true;
    try {
        const response = await $axios.get('/api/loyality');
        points.value = response.data.loyality;
        points_history.value = response.data.loyalityhistory;

    } catch (error) {
        console.error('Error fetching loyality points:', error);
    } finally {
        loading.value = false;
    }
};


const updateLoyalityPoints = async (): Promise<void> => {
    isSubmitting.value = true;
    try {
        await $axios.post('/api/loyality', {
            points: points.value
        });
        flash.success('Loyality points updated successfully.');
        await fetchLoyalityPoints();
    } catch (error) {

        flash.error('Failed to update loyality points.');
    } finally {
        isSubmitting.value = false;
    }
};



onMounted(async () => {
    await fetchLoyalityPoints();
});




</script>

<template>
    <div class="dashboard-main-body">

        <div class="row gy-4">
            <div class="col-md-12">

                <div class="card">
                    <div class="card-header">
                        <h6 class="card-title mb-0">Update Loyalty Points</h6>
                    </div>
                    <div class="card-body">
                        <form @submit.prevent="updateLoyalityPoints">
                        <div class="row gy-3">
                            <div class="col-12">
                                <label class="form-label">Point Per (1 Omani Rial)</label>
                                <input type="number" name="#0" class="form-control" v-model="points">
                            </div>

                            <div class="col-12">
                                <button type="submit" class="btn btn-primary"  :disabled="isSubmitting">
                                    Update Points
                                </button>
                            </div>


                        </div>
                        </form> 
                    </div>


                    <div class="card-body">
                        <div class="row gy-3">
                            <div class="col-12">
                                <label class="form-label">History</label>
                                <div class="table-responsive">
                                    <table class="table table-bordered table-hover mb-0">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Previous Points</th>
                                                <th>Current Points</th>
                                                <th>Created At</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <div v-if="loading">Loading...</div>

                                            <tr v-for="(history,index) in points_history" :key="history.id" v-else>
                                                <td>{{ index + 1 }}</td>
                                                <td>{{ history.Previous_Point }}</td>
                                                <td>{{ history.Current_Point }}</td>
                                                <td>{{ history.created_at }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>


                        </div>
                    </div>
                </div><!-- card end -->

            </div>

        </div>
    </div>
</template>