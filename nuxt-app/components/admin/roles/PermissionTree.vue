<script setup lang="ts">
import { computed } from 'vue'
import {
  adminPermissionTree,
  allAdminPermissionValues,
  normalizePermissionSelection,
} from '~/utils/adminPermissionTree'
import PermissionTreeNode from './PermissionTreeNode.vue'

const props = withDefaults(defineProps<{
  modelValue: string[]
  title?: string
  description?: string
}>(), {
  title: 'Permission Tree',
  description: 'Select a parent to include every child beneath it. Selecting a child keeps its menu parents available.',
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string[]): void
}>()

const knownSelectionCount = computed(() => {
  const selected = new Set(props.modelValue)
  return allAdminPermissionValues.filter((permission) => selected.has(permission)).length
})

const isAllSelected = computed(() => {
  const selected = new Set(props.modelValue)
  return allAdminPermissionValues.every((permission) => selected.has(permission))
})

const updateSelection = (values: string[]) => {
  emit('update:modelValue', normalizePermissionSelection(values))
}

const toggleAll = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked
  updateSelection(checked ? [...allAdminPermissionValues] : [])
}
</script>

<template>
  <section class="permission-tree-card">
    <div class="permission-tree-card__header">
      <div>
        <h6 class="permission-tree-card__title">{{ title }}</h6>
        <p class="permission-tree-card__description">{{ description }}</p>
      </div>
      <div class="permission-tree-count">
        {{ knownSelectionCount }} / {{ allAdminPermissionValues.length }}
      </div>
    </div>

    <label class="permission-tree-select-all">
      <input type="checkbox" :checked="isAllSelected" @change="toggleAll" />
      <span>Select all permissions</span>
    </label>

    <div class="permission-tree-shell">
      <ul class="permission-tree-list">
        <PermissionTreeNode
          v-for="node in adminPermissionTree"
          :key="node.permission"
          :node="node"
          :model-value="modelValue"
          :level="0"
          @update:model-value="updateSelection"
        />
      </ul>
    </div>
  </section>
</template>

<style scoped>
.permission-tree-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
}

.permission-tree-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.permission-tree-card__title {
  margin: 0;
  color: #0f172a;
  font-size: 15px;
  font-weight: 700;
}

.permission-tree-card__description {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12px;
}

.permission-tree-count {
  flex: 0 0 auto;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  padding: 7px 10px;
}

.permission-tree-select-all {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 12px 18px;
  border-bottom: 1px solid #e2e8f0;
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.permission-tree-select-all input,
:deep(.permission-tree-checkbox) {
  width: 16px;
  height: 16px;
  accent-color: #2563eb;
}

.permission-tree-shell {
  max-height: min(62vh, 720px);
  overflow: auto;
  padding: 12px 18px 18px;
}

.permission-tree-list,
:deep(.permission-tree-children) {
  list-style: none;
  margin: 0;
  padding: 0;
}

:deep(.permission-tree-children) {
  position: relative;
  margin-left: 18px;
  padding-left: 14px;
}

:deep(.permission-tree-children::before) {
  content: '';
  position: absolute;
  left: 6px;
  top: 0;
  bottom: 10px;
  width: 1px;
  background: #cbd5e1;
}

:deep(.permission-tree-node) {
  position: relative;
}

:deep(.permission-tree-row) {
  display: flex;
  align-items: center;
  min-height: 34px;
}

:deep(.permission-tree-expander) {
  border: 0;
  background: transparent;
  color: #64748b;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
}

:deep(.permission-tree-expander:hover) {
  background: #e0f2fe;
  color: #0369a1;
}

:deep(.permission-tree-expander--spacer) {
  cursor: default;
}

:deep(.permission-tree-expander--spacer:hover) {
  background: transparent;
}

:deep(.permission-tree-label) {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  width: 100%;
  margin: 0;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
}

:deep(.permission-tree-label:hover) {
  background: #f1f5f9;
}

:deep(.permission-tree-dot) {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #94a3b8;
  box-shadow: 0 0 0 3px #f1f5f9;
}

:deep(.permission-tree-node--branch > .permission-tree-row .permission-tree-dot) {
  background: #2563eb;
}

:deep(.permission-tree-node--partial > .permission-tree-row .permission-tree-dot) {
  background: #f59e0b;
}

:deep(.permission-tree-icon) {
  flex: 0 0 auto;
  color: #475569;
  font-size: 16px;
}

:deep(.permission-tree-title) {
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
}

:deep(.permission-tree-key) {
  min-width: 0;
  color: #64748b;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 767.98px) {
  .permission-tree-card__header {
    display: block;
  }

  .permission-tree-count {
    display: inline-flex;
    margin-top: 10px;
  }

  .permission-tree-shell {
    max-height: none;
  }

  :deep(.permission-tree-key) {
    display: none;
  }
}
</style>
