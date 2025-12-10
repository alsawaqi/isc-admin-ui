<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle, TransitionRoot } from '@headlessui/vue'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue', 'confirm'])

function emitClose() {
  emit('update:modelValue', false)
}

function emitConfirm() {
  emit('confirm')
  emitClose()
}
</script>
<template>
  <TransitionRoot as="template" :show="modelValue">
    <Dialog as="div" class="relative z-50" @close="emitClose">
      <div class="fixed inset-0 bg-black bg-opacity-30" />

      <div class="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel class="bg-white rounded-lg max-w-sm w-full p-6">
          <DialogTitle class="text-lg font-semibold mb-4">
            Are you sure you want to delete?
          </DialogTitle>

          <div class="flex justify-end space-x-4">
            <button @click="emitClose" class="px-4 py-2 bg-gray-200 rounded">Cancel</button>
            <button @click="emitConfirm" class="px-4 py-2 bg-red-600 text-white rounded">Yes, Delete</button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
