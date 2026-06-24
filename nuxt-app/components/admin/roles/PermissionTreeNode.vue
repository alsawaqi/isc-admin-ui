<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import type { AdminPermissionNode } from '~/utils/adminPermissionTree'
import {
  isNodeFullySelected,
  isNodePartiallySelected,
  togglePermissionSelection,
} from '~/utils/adminPermissionTree'

defineOptions({ name: 'PermissionTreeNode' })

const props = defineProps<{
  node: AdminPermissionNode
  modelValue: string[]
  level?: number
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string[]): void
}>()

const isOpen = ref(true)
const checkboxRef = ref<HTMLInputElement | null>(null)

const levelValue = computed(() => props.level ?? 0)
const hasChildren = computed(() => Boolean(props.node.children?.length))
const isChecked = computed(() => isNodeFullySelected(props.node, props.modelValue))
const isPartial = computed(() => {
  return !isChecked.value && isNodePartiallySelected(props.node, props.modelValue)
})

watchEffect(() => {
  if (checkboxRef.value) {
    checkboxRef.value.indeterminate = isPartial.value
  }
})

const toggleOpen = () => {
  if (hasChildren.value) isOpen.value = !isOpen.value
}

const onChange = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked
  emit('update:modelValue', togglePermissionSelection(props.modelValue, props.node.permission, checked))
}
</script>

<template>
  <li
    class="permission-tree-node"
    :class="[
      `permission-tree-node--level-${levelValue}`,
      {
        'permission-tree-node--branch': hasChildren,
        'permission-tree-node--open': isOpen,
        'permission-tree-node--partial': isPartial,
      },
    ]"
  >
    <div class="permission-tree-row">
      <button
        v-if="hasChildren"
        type="button"
        class="permission-tree-expander"
        :aria-label="isOpen ? 'Collapse section' : 'Expand section'"
        @click="toggleOpen"
      >
        <iconify-icon :icon="isOpen ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'" />
      </button>
      <span v-else class="permission-tree-expander permission-tree-expander--spacer" />

      <label class="permission-tree-label">
        <input
          ref="checkboxRef"
          type="checkbox"
          class="permission-tree-checkbox"
          :checked="isChecked"
          @change="onChange"
        />
        <span class="permission-tree-dot" aria-hidden="true" />
        <iconify-icon v-if="node.icon" :icon="node.icon" class="permission-tree-icon" />
        <span class="permission-tree-title">{{ node.label }}</span>
        <span class="permission-tree-key">{{ node.permission }}</span>
      </label>
    </div>

    <ul v-if="hasChildren" v-show="isOpen" class="permission-tree-children">
      <PermissionTreeNode
        v-for="child in node.children"
        :key="child.permission"
        :node="child"
        :model-value="modelValue"
        :level="levelValue + 1"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </ul>
  </li>
</template>
