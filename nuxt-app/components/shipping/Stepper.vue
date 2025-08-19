<script setup lang="ts">
defineProps<{ steps: string[]; active: number }>()
</script>

<template>
  <div class="d-flex align-items-center gap-3 mb-24">
    <template v-for="(s, i) in steps" :key="i">
      <div :class="['px-12 py-8 radius-8',
        i+1 === active ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-600']">
        {{ i+1 }}. {{ s }}
      </div>
      <div v-if="i<steps.length-1" class="text-muted">—</div>
    </template>
  </div>
</template>
