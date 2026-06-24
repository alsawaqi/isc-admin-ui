<script setup lang="ts">
import CompletedOrdersList from '~/components/admin/orders/CompletedOrdersList.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permission: 'order delivery',
})
</script>

<template>
  <CompletedOrdersList />
</template>
