<script setup lang="ts">
import { shallowRef } from 'vue'
import type { ImportHistory } from '~/types/productImport'
defineProps<{ jobs: ImportHistory[]; busy: boolean; error: string }>()
const emit = defineEmits<{ undo: [jobId: number] }>()
const confirming = shallowRef<number | null>(null)
</script>

<template>
  <section v-if="jobs.length" class="history-card" aria-labelledby="history-title">
    <h2 id="history-title">Your recent imports</h2>
    <p>Undo removes eligible new products, reverses imported updates and returns restored products to the archive.</p>
    <ul>
      <li v-for="job in jobs" :key="job.id" :data-import-id="job.id">
        <div class="job-heading"><div><strong>#{{ job.id }} · {{ job.File_Name }}</strong><span>{{ job.Result.created }} added · {{ job.Result.updated ?? 0 }} updated · {{ job.Result.restored ?? 0 }} restored · {{ job.Committed_At }}</span></div>
          <span v-if="job.Status === 'rolled_back'" class="undone">Undone</span>
          <button v-else-if="job.Result.undo_available" type="button" :disabled="busy" :aria-expanded="confirming === Number(job.id)" @click="confirming = Number(job.id)">Undo import #{{ job.id }}</button>
          <span v-else>Undo unavailable for this older import.</span>
        </div>
        <p v-if="job.Status === 'rolled_back'">Removed {{ job.Result.rollback?.products_removed }} products and reversed {{ job.Result.rollback?.updates_reversed ?? 0 }} updates · {{ job.Result.rollback?.rolled_back_at }}</p>
        <div v-else-if="confirming === Number(job.id)" class="confirmation" role="group" :aria-label="`Confirm undo import ${job.id}`">
          <p>Undo <strong>{{ job.File_Name }}</strong>? This removes {{ job.Result.created }} new products, reverses {{ job.Result.updated ?? 0 }} updates and returns {{ job.Result.restored ?? 0 }} restored products to the archive. Later changes may prevent undo.</p>
          <p v-if="error" role="alert" class="error">{{ error }}</p>
          <div class="actions"><button type="button" class="danger" :disabled="busy" @click="emit('undo', Number(job.id))">{{ busy ? 'Please wait…' : 'Confirm undo' }}</button><button type="button" :disabled="busy" @click="confirming = null">Cancel</button></div>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.history-card { background: white; border: 1px solid #dce3ed; border-radius: 12px; padding: 24px; margin-top: 28px; font-size: 14px; }.history-card h2 { --h2: 19px; margin-bottom: 12px; }.history-card p { color: #526079; line-height: 1.6; margin: 10px 0; }.history-card ul { padding: 0; list-style: none; }.history-card li { padding: 18px 0; border-bottom: 1px solid #e0e6ee; }.job-heading { display: flex; gap: 16px; justify-content: space-between; align-items: center; flex-wrap: wrap; }.job-heading strong { overflow-wrap: anywhere; }.job-heading span { display: block; margin-top: 5px; }.undone { color: #166346; font-weight: 600; }.confirmation { margin-top: 16px; padding: 16px; background: #fff8ef; border: 1px solid #ebcfae; border-radius: 8px; }.actions { display: flex; gap: 12px; flex-wrap: wrap; }.history-card button { border: 1px solid #b9c6d8; background: white; border-radius: 7px; padding: 10px 14px; font-weight: 600; }.history-card button.danger { background: #a62b32; border-color: #a62b32; color: white; }.history-card button:disabled { opacity: .5; cursor: not-allowed; }.history-card .error { color: #a32224; }
</style>
