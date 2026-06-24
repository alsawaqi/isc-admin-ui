<script setup lang="ts">
import { useNuxtApp } from '#imports';
import { computed, ref, onMounted } from 'vue';
import { useFlashStore } from '~/stores/flashs'

interface LoyalityHistory {
    id: number;
    Current_Point: number | string | null;
    Previous_Point: number | string | null;
    Current_Earn_Amount?: number | string | null;
    Previous_Earn_Amount?: number | string | null;
    Current_Earn_Points?: number | string | null;
    Previous_Earn_Points?: number | string | null;
    Current_Redeem_Points?: number | string | null;
    Previous_Redeem_Points?: number | string | null;
    Current_Redeem_Amount?: number | string | null;
    Previous_Redeem_Amount?: number | string | null;
    created_at: string;
}

const flash = useFlashStore()
const { $axios } = (useNuxtApp() as any);

const earnAmount = ref<number>(1);
const earnPoints = ref<number>(0);
const redeemPoints = ref<number>(1000);
const redeemAmount = ref<number>(1);
const loading = ref<boolean>(false);
const isSubmitting = ref<boolean>(false);
const points_history = ref<LoyalityHistory[]>([]);

const pointsPerOmaniRial = computed(() => {
    if (!earnAmount.value) return 0;
    return earnPoints.value / earnAmount.value;
});

const redemptionValuePerPoint = computed(() => {
    if (!redeemPoints.value) return 0;
    return redeemAmount.value / redeemPoints.value;
});

const asNumber = (value: number | string | null | undefined, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const formatNumber = (value: number | string | null | undefined, decimals = 3): string => {
    return asNumber(value).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
    });
};

const formatMoney = (value: number | string | null | undefined): string => {
    return `${formatNumber(value, 3)} OMR`;
};

const historyEarnLabel = (history: LoyalityHistory, prefix: 'Current' | 'Previous'): string => {
    const amount = history[`${prefix}_Earn_Amount` as keyof LoyalityHistory];
    const points = history[`${prefix}_Earn_Points` as keyof LoyalityHistory];
    const legacyPoint = history[`${prefix}_Point` as keyof LoyalityHistory];

    if (amount !== undefined && amount !== null && points !== undefined && points !== null) {
        return `${formatNumber(points)} pts / ${formatMoney(amount)}`;
    }

    return `${formatNumber(legacyPoint)} pts / 1 OMR`;
};

const historyRedeemLabel = (history: LoyalityHistory, prefix: 'Current' | 'Previous'): string => {
    const points = history[`${prefix}_Redeem_Points` as keyof LoyalityHistory];
    const amount = history[`${prefix}_Redeem_Amount` as keyof LoyalityHistory];

    if (points === undefined || points === null || amount === undefined || amount === null) {
        return '-';
    }

    return `${formatNumber(points)} pts = ${formatMoney(amount)}`;
};

const fetchLoyalityPoints = async (): Promise<void> => {
    loading.value = true;
    try {
        const response = await $axios.get('/api/loyality');
        const settings = response.data.loyality_settings || {};

        earnAmount.value = asNumber(settings.earn_amount, 1);
        earnPoints.value = asNumber(settings.earn_points, asNumber(response.data.loyality));
        redeemPoints.value = asNumber(settings.redeem_points, 1000);
        redeemAmount.value = asNumber(settings.redeem_amount, 1);
        points_history.value = response.data.loyalityhistory;

    } catch (error) {
        console.error('Error fetching loyalty points:', error);
        flash.error('Failed to fetch loyalty points.');
    } finally {
        loading.value = false;
    }
};


const updateLoyalityPoints = async (): Promise<void> => {
    isSubmitting.value = true;
    try {
        await $axios.post('/api/loyality', {
            earn_amount: earnAmount.value,
            earn_points: earnPoints.value,
            redeem_points: redeemPoints.value,
            redeem_amount: redeemAmount.value,
        });
        flash.success('Loyalty points updated successfully.');
        await fetchLoyalityPoints();
    } catch (error) {

        flash.error('Failed to update loyalty points.');
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
                                <div class="col-lg-6">
                                    <div class="border rounded-3 p-3 h-100">
                                        <h6 class="mb-3">Earn Rule</h6>
                                        <div class="row gy-3">
                                            <div class="col-md-6">
                                                <label class="form-label">Amount Spent (OMR)</label>
                                                <input
                                                    type="number"
                                                    min="0.001"
                                                    step="0.001"
                                                    class="form-control"
                                                    v-model.number="earnAmount"
                                                >
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Points Earned</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    class="form-control"
                                                    v-model.number="earnPoints"
                                                >
                                            </div>
                                            <div class="col-12">
                                                <div class="bg-light rounded-3 px-3 py-2 text-sm">
                                                    {{ formatNumber(earnPoints) }} points per {{ formatMoney(earnAmount) }}
                                                    <span class="text-secondary">
                                                        ({{ formatNumber(pointsPerOmaniRial) }} points per 1 OMR)
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="col-lg-6">
                                    <div class="border rounded-3 p-3 h-100">
                                        <h6 class="mb-3">Redeem Rule</h6>
                                        <div class="row gy-3">
                                            <div class="col-md-6">
                                                <label class="form-label">Points Used</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    class="form-control"
                                                    v-model.number="redeemPoints"
                                                >
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Discount Amount (OMR)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.001"
                                                    class="form-control"
                                                    v-model.number="redeemAmount"
                                                >
                                            </div>
                                            <div class="col-12">
                                                <div class="bg-light rounded-3 px-3 py-2 text-sm">
                                                    {{ formatNumber(redeemPoints) }} points = {{ formatMoney(redeemAmount) }}
                                                    <span class="text-secondary">
                                                        ({{ formatMoney(redemptionValuePerPoint) }} per point)
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="col-12">
                                    <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
                                        {{ isSubmitting ? 'Updating...' : 'Update Points' }}
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
                                                <th>Previous Rule</th>
                                                <th>Current Rule</th>
                                                <th>Points / 1 OMR</th>
                                                <th>Created At</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-if="loading">
                                                <td colspan="5">Loading...</td>
                                            </tr>

                                            <template v-else>
                                                <tr v-if="!points_history.length">
                                                    <td colspan="5">No history available.</td>
                                                </tr>

                                                <tr v-for="(history,index) in points_history" :key="history.id">
                                                    <td>{{ index + 1 }}</td>
                                                    <td>
                                                        <div>{{ historyEarnLabel(history, 'Previous') }}</div>
                                                        <div class="text-secondary">{{ historyRedeemLabel(history, 'Previous') }}</div>
                                                    </td>
                                                    <td>
                                                        <div>{{ historyEarnLabel(history, 'Current') }}</div>
                                                        <div class="text-secondary">{{ historyRedeemLabel(history, 'Current') }}</div>
                                                    </td>
                                                    <td>{{ formatNumber(history.Current_Point) }}</td>
                                                    <td>{{ history.created_at }}</td>
                                                </tr>
                                            </template>
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
