<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import type {
  HierarchyMoveAction,
  HierarchyOrderRow,
} from '~/utils/productHierarchyOrder'
import {
  hierarchyDragAutoScrollDelta,
  moveHierarchyRow,
  moveHierarchyRowToPosition,
} from '~/utils/productHierarchyOrder.js'

const props = withDefaults(defineProps<{
  title: string
  subtitle: string
  rows: HierarchyOrderRow[]
  selectedId?: number | null
  search: string
  loading?: boolean
  error?: string
  busy?: boolean
  total?: number
  hasMore?: boolean
  dragDisabled?: boolean
  dragDisabledReason?: string
  emptyTitle?: string
  emptyCopy?: string
}>(), {
  selectedId: null,
  loading: false,
  error: '',
  busy: false,
  total: 0,
  hasMore: false,
  dragDisabled: false,
  dragDisabledReason: '',
  emptyTitle: 'Nothing here yet',
  emptyCopy: 'There are no categories to display in this level.',
})

const emit = defineEmits<{
  select: [id: number]
  move: [payload: { id: number; beforeId: number | null }]
  retry: []
  loadMore: []
  'update:search': [value: string]
}>()

type DropPosition = 'before' | 'after'

const draggedId = ref<number | null>(null)
const dropTargetId = ref<number | null>(null)
const dropPosition = ref<DropPosition>('before')
const columnRef = ref<HTMLElement | null>(null)
const bodyRef = ref<HTMLElement | null>(null)
const editingPositionId = ref<number | null>(null)
const positionDraft = ref('')
const positionAnnouncement = ref('')
let autoScrollFrame: number | null = null
let dragPointerX = 0
let dragPointerY = 0
let dragListenerActive = false

const visibleTotal = computed(() => props.total || props.rows.length)
const canReorder = computed(() => (
  !props.dragDisabled
  && !props.loading
  && !props.busy
  && props.rows.length > 1
))

const selectRow = (id: number) => {
  emit('select', id)
}

const updateDropTarget = (element: HTMLElement, targetId: number, clientY: number) => {
  if (draggedId.value === null || draggedId.value === targetId) return

  const bounds = element.getBoundingClientRect()
  dropTargetId.value = targetId
  dropPosition.value = clientY < bounds.top + (bounds.height / 2) ? 'before' : 'after'
}

const updateDropTargetFromPoint = () => {
  if (!bodyRef.value || draggedId.value === null) return

  const element = document.elementFromPoint(dragPointerX, dragPointerY)
  const rowElement = element?.closest<HTMLElement>('[data-order-row-id]')
  if (!rowElement || !bodyRef.value.contains(rowElement)) return

  const targetId = Number(rowElement.dataset.orderRowId)
  if (!Number.isInteger(targetId)) return
  updateDropTarget(rowElement, targetId, dragPointerY)
}

const canScrollElement = (element: HTMLElement, delta: number) => {
  if (delta < 0) return element.scrollTop > 0
  if (delta > 0) return element.scrollTop + element.clientHeight < element.scrollHeight - 1
  return false
}

const autoScrollTick = () => {
  autoScrollFrame = null
  if (draggedId.value === null || !bodyRef.value) return

  const body = bodyRef.value
  const bounds = body.getBoundingClientRect()
  const localDelta = hierarchyDragAutoScrollDelta(dragPointerY, bounds.top, bounds.bottom)
  let didScroll = false

  if (localDelta && canScrollElement(body, localDelta)) {
    const previousTop = body.scrollTop
    body.scrollTop += localDelta
    didScroll = body.scrollTop !== previousTop
  } else {
    const viewportDelta = hierarchyDragAutoScrollDelta(
      dragPointerY,
      0,
      window.innerHeight,
      { edge: 84, maxSpeed: 16 },
    )
    const documentHeight = document.documentElement.scrollHeight
    const canScrollWindow = viewportDelta < 0
      ? window.scrollY > 0
      : window.scrollY + window.innerHeight < documentHeight - 1

    if (viewportDelta && canScrollWindow) {
      const previousY = window.scrollY
      window.scrollBy({ top: viewportDelta, left: 0, behavior: 'auto' })
      didScroll = window.scrollY !== previousY
    }
  }

  if (didScroll) updateDropTargetFromPoint()
  autoScrollFrame = window.requestAnimationFrame(autoScrollTick)
}

const scheduleAutoScroll = () => {
  if (autoScrollFrame === null && draggedId.value !== null) {
    autoScrollFrame = window.requestAnimationFrame(autoScrollTick)
  }
}

const onDocumentDragOver = (event: DragEvent) => {
  if (draggedId.value === null) return

  dragPointerX = event.clientX
  dragPointerY = event.clientY
  const target = event.target
  if (target instanceof Node && columnRef.value?.contains(target)) event.preventDefault()
  scheduleAutoScroll()
}

const startAutoScroll = () => {
  if (!dragListenerActive) {
    document.addEventListener('dragover', onDocumentDragOver, { passive: false })
    dragListenerActive = true
  }
  scheduleAutoScroll()
}

const stopAutoScroll = () => {
  if (autoScrollFrame !== null) {
    window.cancelAnimationFrame(autoScrollFrame)
    autoScrollFrame = null
  }
  if (dragListenerActive) {
    document.removeEventListener('dragover', onDocumentDragOver)
    dragListenerActive = false
  }
}

const clearDragState = () => {
  stopAutoScroll()
  draggedId.value = null
  dropTargetId.value = null
  dropPosition.value = 'before'
}

const onDragStart = (event: DragEvent, row: HierarchyOrderRow) => {
  if (!canReorder.value) {
    event.preventDefault()
    return
  }

  draggedId.value = row.id
  dropTargetId.value = null
  dragPointerX = event.clientX
  dragPointerY = event.clientY
  startAutoScroll()
  event.dataTransfer?.setData('text/plain', String(row.id))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

const onDragOver = (event: DragEvent, row: HierarchyOrderRow) => {
  if (!canReorder.value || draggedId.value === null || draggedId.value === row.id) return

  const element = event.currentTarget as HTMLElement | null
  if (!element) return

  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  dragPointerX = event.clientX
  dragPointerY = event.clientY
  updateDropTarget(element, row.id, event.clientY)
  scheduleAutoScroll()
}

const onBodyDragOver = (event: DragEvent) => {
  if (!canReorder.value || draggedId.value === null) return

  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  dragPointerX = event.clientX
  dragPointerY = event.clientY
  updateDropTargetFromPoint()
  scheduleAutoScroll()
}

const resolveDropAnchor = (targetId: number, position: DropPosition) => {
  if (position === 'before') return targetId

  const candidates = props.rows.filter(row => row.id !== draggedId.value)
  const targetIndex = candidates.findIndex(row => row.id === targetId)
  return candidates[targetIndex + 1]?.id ?? null
}

const onDrop = (event: DragEvent, target: HierarchyOrderRow) => {
  event.preventDefault()
  const movedId = draggedId.value
  if (!canReorder.value || movedId === null || movedId === target.id) {
    clearDragState()
    return
  }

  const beforeId = resolveDropAnchor(target.id, dropPosition.value)
  clearDragState()
  emit('move', { id: movedId, beforeId })
}

const moveWithControl = (row: HierarchyOrderRow, action: HierarchyMoveAction) => {
  if (!canReorder.value) return

  const result = moveHierarchyRow(props.rows, row.id, action)
  if (!result.changed) return
  emit('move', { id: row.id, beforeId: result.beforeId })
}

const focusPositionInput = (id: number) => {
  nextTick(() => {
    const input = bodyRef.value?.querySelector<HTMLInputElement>(`[data-position-input="${id}"]`)
    input?.focus()
    input?.select()
  })
}

const startPositionEdit = (row: HierarchyOrderRow, index: number) => {
  if (!canReorder.value) return

  editingPositionId.value = row.id
  positionDraft.value = String(index + 1)
  positionAnnouncement.value = `Editing ${row.name || 'category'} position.`
  focusPositionInput(row.id)
}

const cancelPositionEdit = () => {
  editingPositionId.value = null
  positionDraft.value = ''
  positionAnnouncement.value = 'Position change cancelled.'
}

const commitPosition = (row: HierarchyOrderRow) => {
  if (editingPositionId.value !== row.id) return

  const targetPosition = Number(positionDraft.value)
  if (!Number.isInteger(targetPosition) || targetPosition < 1 || targetPosition > props.rows.length) {
    editingPositionId.value = null
    positionDraft.value = ''
    positionAnnouncement.value = `Enter a position between 1 and ${props.rows.length}.`
    return
  }

  const result = moveHierarchyRowToPosition(props.rows, row.id, targetPosition)
  editingPositionId.value = null
  positionDraft.value = ''
  if (!result.changed) {
    positionAnnouncement.value = `${row.name || 'Category'} is already at position ${targetPosition}.`
    return
  }

  positionAnnouncement.value = `${row.name || 'Category'} moved to position ${targetPosition}.`
  emit('move', { id: row.id, beforeId: result.beforeId })
}

const rowIndex = (id: number) => props.rows.findIndex(row => row.id === id)
const isFirst = (id: number) => rowIndex(id) <= 0
const isLast = (id: number) => rowIndex(id) === props.rows.length - 1

onBeforeUnmount(stopAutoScroll)
</script>

<template>
  <section ref="columnRef" class="order-column" :aria-busy="loading || busy">
    <span class="visually-hidden" aria-live="polite">{{ positionAnnouncement }}</span>
    <header class="order-column__header">
      <div class="order-column__heading">
        <div>
          <h2>{{ title }}</h2>
          <p>{{ subtitle }}</p>
        </div>
        <span class="order-column__count" :aria-label="visibleTotal + ' total items'">
          {{ rows.length }}<template v-if="visibleTotal !== rows.length"> / {{ visibleTotal }}</template>
        </span>
      </div>

      <label class="order-column__search">
        <span class="visually-hidden">Search {{ title }}</span>
        <iconify-icon icon="solar:magnifer-linear" aria-hidden="true" />
        <input
          :value="search"
          type="search"
          :placeholder="'Search ' + title.toLowerCase()"
          autocomplete="off"
          @input="emit('update:search', ($event.target as HTMLInputElement).value)"
        >
        <span v-if="loading && rows.length" class="order-column__mini-spinner" aria-hidden="true" />
      </label>

      <p v-if="dragDisabledReason && rows.length > 1" class="order-column__notice">
        <iconify-icon icon="solar:info-circle-linear" aria-hidden="true" />
        {{ dragDisabledReason }}
      </p>
    </header>

    <div v-if="loading && !rows.length" class="order-column__state" role="status">
      <span class="order-column__spinner" aria-hidden="true" />
      <strong>Loading {{ title.toLowerCase() }}</strong>
      <span>Getting the latest display order.</span>
    </div>

    <div v-else-if="error && !rows.length" class="order-column__state order-column__state--error" role="alert">
      <span class="order-column__state-icon">
        <iconify-icon icon="solar:danger-triangle-linear" aria-hidden="true" />
      </span>
      <strong>Could not load this level</strong>
      <span>{{ error }}</span>
      <button type="button" class="order-column__retry" @click="emit('retry')">
        Try again
      </button>
    </div>

    <div v-else-if="!rows.length" class="order-column__state">
      <span class="order-column__state-icon">
        <iconify-icon icon="solar:folder-open-linear" aria-hidden="true" />
      </span>
      <strong>{{ emptyTitle }}</strong>
      <span>{{ emptyCopy }}</span>
    </div>

    <div v-else ref="bodyRef" class="order-column__body" @dragover="onBodyDragOver">
      <div class="order-column__list" role="list" :aria-label="title">
        <article
          v-for="(row, index) in rows"
          :key="row.level + '-' + row.id"
          class="order-row"
          :data-order-row-id="row.id"
          :class="{
            'order-row--selected': selectedId === row.id,
            'order-row--saving': busy,
            'order-row--drop-before': dropTargetId === row.id && dropPosition === 'before',
            'order-row--drop-after': dropTargetId === row.id && dropPosition === 'after',
          }"
          role="listitem"
          @click="selectRow(row.id)"
          @dragover="onDragOver($event, row)"
          @drop="onDrop($event, row)"
        >
          <button
            type="button"
            class="order-row__handle"
            :class="{ 'order-row__handle--disabled': !canReorder }"
            :draggable="canReorder"
            :disabled="!canReorder"
            :aria-label="'Drag to reorder ' + row.name"
            :title="canReorder ? 'Drag to reorder' : dragDisabledReason"
            tabindex="-1"
            @click.stop
            @dragstart="onDragStart($event, row)"
            @dragend="clearDragState"
          >
            <iconify-icon icon="solar:hamburger-menu-linear" aria-hidden="true" />
          </button>

          <span class="order-row__position-wrap" @click.stop>
            <input
              v-if="editingPositionId === row.id"
              v-model="positionDraft"
              class="order-row__position order-row__position--input"
              type="number"
              inputmode="numeric"
              :min="1"
              :max="rows.length"
              :data-position-input="row.id"
              :aria-label="'Move ' + row.name + ' to position'"
              @click.stop
              @keydown.enter.prevent="commitPosition(row)"
              @keydown.esc.prevent="cancelPositionEdit"
              @blur="commitPosition(row)"
            >
            <button
              v-else
              type="button"
              class="order-row__position"
              :disabled="!canReorder"
              :aria-label="'Position ' + (index + 1) + '. Click to change ' + row.name + ' position'"
              title="Click to set position"
              @click.stop="startPositionEdit(row, index)"
            >{{ index + 1 }}</button>
          </span>

          <button
            type="button"
            class="order-row__content"
            :aria-current="selectedId === row.id ? 'true' : undefined"
            @click.stop="selectRow(row.id)"
          >
            <span class="order-row__name">
              <span>{{ row.name || 'Unnamed category' }}</span>
              <iconify-icon
                v-if="selectedId === row.id"
                icon="solar:arrow-right-linear"
                aria-hidden="true"
              />
            </span>
            <span v-if="row.nameAr" class="order-row__arabic" dir="rtl">{{ row.nameAr }}</span>
            <span class="order-row__meta">
              <code>{{ row.code || 'No code' }}</code>
              <span v-if="row.childCount > 0">{{ row.childCount }} children</span>
            </span>
          </button>

          <div class="order-row__actions" aria-label="Reorder controls" @click.stop>
            <button
              type="button"
              :disabled="!canReorder || isFirst(row.id)"
              :aria-label="'Move ' + row.name + ' to top'"
              title="Move to top"
              @click="moveWithControl(row, 'top')"
            >
              <iconify-icon icon="solar:double-alt-arrow-up-linear" aria-hidden="true" />
            </button>
            <button
              type="button"
              :disabled="!canReorder || isFirst(row.id)"
              :aria-label="'Move ' + row.name + ' up'"
              title="Move up"
              @click="moveWithControl(row, 'up')"
            >
              <iconify-icon icon="solar:alt-arrow-up-linear" aria-hidden="true" />
            </button>
            <button
              type="button"
              :disabled="!canReorder || isLast(row.id)"
              :aria-label="'Move ' + row.name + ' down'"
              title="Move down"
              @click="moveWithControl(row, 'down')"
            >
              <iconify-icon icon="solar:alt-arrow-down-linear" aria-hidden="true" />
            </button>
            <button
              type="button"
              :disabled="!canReorder || isLast(row.id)"
              :aria-label="'Move ' + row.name + ' to bottom'"
              title="Move to bottom"
              @click="moveWithControl(row, 'bottom')"
            >
              <iconify-icon icon="solar:double-alt-arrow-down-linear" aria-hidden="true" />
            </button>
          </div>
        </article>
      </div>

      <div v-if="error" class="order-column__inline-error" role="alert">
        <span>{{ error }}</span>
        <button type="button" @click="emit('retry')">Retry</button>
      </div>

      <button
        v-if="hasMore"
        type="button"
        class="order-column__load-more"
        :disabled="loading"
        @click="emit('loadMore')"
      >
        <span v-if="loading" class="order-column__mini-spinner" aria-hidden="true" />
        <iconify-icon v-else icon="solar:add-circle-linear" aria-hidden="true" />
        Load more
      </button>
    </div>
  </section>
</template>

<style scoped>
.order-column {
  --order-accent: #2563eb;
  --order-accent-soft: #eff6ff;
  --order-border: #e5e7eb;
  --order-muted: #64748b;
  --order-surface: #ffffff;
  display: flex;
  min-height: 34rem;
  max-height: calc(100vh - 19.5rem);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--order-border);
  border-radius: 0.9rem;
  background: var(--order-surface);
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.order-column__header {
  z-index: 2;
  padding: 0.82rem;
  border-bottom: 1px solid var(--order-border);
  background: var(--order-surface);
}

.order-column__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.order-column__heading h2 {
  margin: 0;
  color: #0f172a;
  font-size: 0.9rem !important;
  line-height: 1.25 !important;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.order-column__heading p {
  margin: 0.25rem 0 0;
  color: var(--order-muted);
  font-size: 0.74rem;
  line-height: 1.35;
}

.order-column__count {
  flex: none;
  border-radius: 999px;
  background: #f1f5f9;
  padding: 0.22rem 0.55rem;
  color: #475569;
  font-size: 0.7rem;
  font-weight: 700;
}

.order-column__search {
  display: flex;
  height: 2.45rem;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.85rem;
  border: 1px solid var(--order-border);
  border-radius: 0.65rem;
  padding: 0 0.75rem;
  color: #94a3b8;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.order-column__search:focus-within {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgb(59 130 246 / 0.12);
}

.order-column__search iconify-icon {
  flex: none;
  font-size: 1.05rem;
}

.order-column__search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #0f172a;
  font-size: 0.78rem;
}

.order-column__search input::placeholder {
  color: #94a3b8;
}

.order-column__notice {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  margin: 0.6rem 0 0;
  color: #b45309;
  font-size: 0.69rem;
  line-height: 1.4;
}

.order-column__notice iconify-icon {
  flex: none;
  margin-top: 0.08rem;
  font-size: 0.88rem;
}

.order-column__body {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}

.order-column__list {
  padding: 0.55rem;
}

.order-row {
  position: relative;
  display: grid;
  grid-template-columns: 1.65rem 2.15rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.35rem;
  min-height: 4.3rem;
  margin-bottom: 0.35rem;
  border: 1px solid transparent;
  border-radius: 0.65rem;
  padding: 0.45rem;
  background: #fff;
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease, box-shadow 120ms ease;
}

.order-row:hover {
  border-color: #dbeafe;
  background: #f8fbff;
}

.order-row:focus-visible {
  outline: 3px solid rgb(59 130 246 / 0.2);
  outline-offset: -2px;
}

.order-row--selected {
  border-color: #93c5fd;
  background: var(--order-accent-soft);
  box-shadow: inset 3px 0 0 var(--order-accent);
}

.order-row--saving {
  opacity: 0.7;
  pointer-events: none;
}

.order-row--drop-before::before,
.order-row--drop-after::after {
  position: absolute;
  right: 0.4rem;
  left: 0.4rem;
  height: 3px;
  border-radius: 999px;
  background: var(--order-accent);
  content: '';
}

.order-row--drop-before::before {
  top: -0.25rem;
}

.order-row--drop-after::after {
  bottom: -0.25rem;
}

.order-row__handle,
.order-row__actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  color: #64748b;
}

.order-row__handle {
  width: 1.65rem;
  height: 2.35rem;
  border-radius: 0.45rem;
  background: transparent;
  cursor: grab;
  font-size: 1.15rem;
}

.order-row__handle:hover:not(:disabled) {
  background: #e2e8f0;
  color: #334155;
}

.order-row__handle:active:not(:disabled) {
  cursor: grabbing;
}

.order-row__handle--disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.order-row__position-wrap {
  display: inline-flex;
  width: 2.15rem;
  align-items: center;
  justify-content: center;
}

.order-row__position {
  display: inline-flex;
  width: 2.05rem;
  height: 1.65rem;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 0.45rem;
  background: #f1f5f9;
  color: #475569;
  cursor: pointer;
  font-size: 0.68rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.order-row__position:hover:not(:disabled),
.order-row__position:focus-visible {
  border-color: #93c5fd;
  outline: none;
  background: #eff6ff;
  color: #1d4ed8;
}

.order-row__position:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.order-row__position--input {
  appearance: textfield;
  padding: 0.12rem;
  text-align: center;
}

.order-row__position--input::-webkit-inner-spin-button,
.order-row__position--input::-webkit-outer-spin-button {
  margin: 0;
  appearance: none;
}

.order-row__content {
  min-width: 0;
  border: 0;
  padding: 0.15rem 0.2rem;
  background: transparent;
  text-align: left;
}

.order-row__name {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  color: #172033;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.25;
}

.order-row__name > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-row__name iconify-icon {
  flex: none;
  color: var(--order-accent);
  font-size: 0.9rem;
}

.order-row__arabic {
  display: block;
  overflow: hidden;
  margin-top: 0.18rem;
  color: #64748b;
  font-size: 0.69rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-row__meta {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.27rem;
  color: #94a3b8;
  font-size: 0.61rem;
}

.order-row__meta code {
  overflow: hidden;
  max-width: 10.5rem;
  color: #64748b;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.6rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-row__meta span {
  flex: none;
}

.order-row__actions {
  display: grid;
  grid-template-columns: repeat(2, 1.65rem);
  gap: 0.18rem;
  opacity: 0;
  transition: opacity 120ms ease;
}

.order-row:hover .order-row__actions,
.order-row:focus-within .order-row__actions,
.order-row--selected .order-row__actions {
  opacity: 1;
}

.order-row__actions button {
  width: 1.65rem;
  height: 1.55rem;
  border-radius: 0.38rem;
  background: #f1f5f9;
  cursor: pointer;
  font-size: 0.9rem;
}

.order-row__actions button:hover:not(:disabled) {
  background: #dbeafe;
  color: #1d4ed8;
}

.order-row__actions button:disabled {
  cursor: not-allowed;
  opacity: 0.32;
}

.order-column__state {
  display: flex;
  min-height: 20rem;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--order-muted);
  text-align: center;
}

.order-column__state strong {
  margin-top: 0.65rem;
  color: #334155;
  font-size: 0.86rem;
}

.order-column__state > span:last-of-type {
  max-width: 15rem;
  margin-top: 0.3rem;
  font-size: 0.72rem;
  line-height: 1.5;
}

.order-column__state-icon {
  display: inline-flex;
  width: 2.75rem;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.8rem;
  background: #f1f5f9;
  color: #64748b;
  font-size: 1.35rem;
}

.order-column__state--error .order-column__state-icon {
  background: #fef2f2;
  color: #dc2626;
}

.order-column__retry,
.order-column__load-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.55rem;
  background: #fff;
  color: #334155;
  font-size: 0.72rem;
  font-weight: 700;
}

.order-column__retry {
  margin-top: 0.85rem;
  padding: 0.5rem 0.85rem;
}

.order-column__load-more {
  width: calc(100% - 1.1rem);
  margin: 0 0.55rem 0.7rem;
  padding: 0.58rem;
}

.order-column__retry:hover,
.order-column__load-more:hover:not(:disabled) {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
}

.order-column__load-more:disabled {
  cursor: wait;
  opacity: 0.65;
}

.order-column__inline-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin: 0 0.55rem 0.55rem;
  border-radius: 0.5rem;
  background: #fef2f2;
  padding: 0.55rem 0.7rem;
  color: #b91c1c;
  font-size: 0.68rem;
}

.order-column__inline-error button {
  flex: none;
  border: 0;
  background: transparent;
  color: #991b1b;
  font-weight: 700;
  text-decoration: underline;
}

.order-column__spinner,
.order-column__mini-spinner {
  display: inline-block;
  border: 2px solid #bfdbfe;
  border-top-color: #2563eb;
  border-radius: 999px;
  animation: hierarchy-spin 700ms linear infinite;
}

.order-column__spinner {
  width: 1.55rem;
  height: 1.55rem;
}

.order-column__mini-spinner {
  width: 0.85rem;
  height: 0.85rem;
}

@keyframes hierarchy-spin {
  to { transform: rotate(360deg); }
}

:global(.dark) .order-column {
  --order-accent-soft: rgb(37 99 235 / 0.12);
  --order-border: #273244;
  --order-muted: #94a3b8;
  --order-surface: #182235;
}

:global(.dark) .order-column__heading h2,
:global(.dark) .order-column__search input,
:global(.dark) .order-row__name,
:global(.dark) .order-column__state strong {
  color: #e2e8f0;
}

:global(.dark) .order-column__count,
:global(.dark) .order-row__position,
:global(.dark) .order-row__actions button,
:global(.dark) .order-column__state-icon {
  background: #253147;
  color: #cbd5e1;
}

:global(.dark) .order-row {
  background: #182235;
}

:global(.dark) .order-row:hover {
  border-color: #334c73;
  background: #1d2a40;
}

:global(.dark) .order-row--selected {
  border-color: #3b82f6;
  background: rgb(37 99 235 / 0.12);
}

:global(.dark) .order-row__handle:hover:not(:disabled),
:global(.dark) .order-column__retry,
:global(.dark) .order-column__load-more {
  background: #253147;
  color: #cbd5e1;
}

@media (max-width: 1400px) {
  .order-row {
    grid-template-columns: 1.45rem 2.15rem minmax(0, 1fr);
    grid-template-rows: auto auto;
  }

  .order-row__handle {
    grid-column: 1;
    grid-row: 1 / span 2;
  }

  .order-row__position-wrap {
    grid-column: 2;
    grid-row: 1 / span 2;
  }

  .order-row__content {
    grid-column: 3;
    grid-row: 1;
  }

  .order-row__actions {
    grid-column: 3;
    grid-row: 2;
    grid-template-columns: repeat(4, 1.5rem);
    justify-content: start;
    opacity: 1;
  }

  .order-row__actions button {
    width: 1.5rem;
    height: 1.4rem;
  }
}

@media (max-width: 1199px) {
  .order-column {
    max-height: 36rem;
  }
}

@media (hover: none), (pointer: coarse) {
  .order-row__actions {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .order-row,
  .order-column__search,
  .order-row__actions {
    transition: none;
  }
}
</style>
