<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { definePageMeta, useHead } from '#imports'
import ProductImportHistory from '~/components/admin/product/ProductImportHistory.vue'
import { useProductImport } from '~/composables/useProductImport'

definePageMeta({ layout: 'admin', middleware: ['permission'], permission: 'product master' })
useHead({ title: 'Undo an import · ISC Admin' })

const { history, busy, error, undoNotice, loadHistory, rollback } = useProductImport()
const loading = ref(true)
onMounted(async () => {
  await loadHistory()
  loading.value = false
})
</script>

<template>
  <div class="dashboard-main-body">
    <NuxtLink to="/admin/product/import">Back to Excel upload</NuxtLink>
    <h1>Undo an import</h1>
    <p v-if="undoNotice" role="status">{{ undoNotice }}</p>
    <p v-if="loading" role="status">Loading imports…</p>
    <p v-else-if="error" role="alert">{{ error }}</p>
    <p v-else-if="!history.length">You have no imports to undo.</p>
    <ProductImportHistory :jobs="history" :busy="Boolean(busy)" :error="error" @undo="rollback" />
  </div>
</template>
