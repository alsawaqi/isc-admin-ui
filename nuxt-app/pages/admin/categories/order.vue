<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue'
import { definePageMeta, useNuxtApp } from '#imports'
import { useFlashStore } from '~/stores/flashs'
import { apiErrorMessage } from '~/utils/apiError'
import type {
  HierarchyOrderLevel,
  HierarchyOrderRow,
} from '~/utils/productHierarchyOrder'
import {
  buildHierarchyMovePayload,
  buildHierarchyResetPayload,
  buildHierarchyUndoMove,
  classifyHierarchyRevision,
  extractHierarchyOrderPage,
  filterHierarchyOrderRows,
  hierarchyOrderScopeKey,
  moveBeforeSibling,
  normalizeHierarchyLevel,
  normalizeHierarchyOrderRow,
} from '~/utils/productHierarchyOrder.js'

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permission: 'product category',
})

interface PaneState {
  level: HierarchyOrderLevel
  rows: HierarchyOrderRow[]
  search: string
  loading: boolean
  busy: boolean
  error: string
  page: number
  lastPage: number
  total: number
  revision: number | null
  requestId: number
}

interface SavedHierarchyMove {
  level: HierarchyOrderLevel
  parentId: number | null
  scopeKey: string
  id: number
  beforeId: number | null
  name: string
  postRevision: number
}

interface GlobalHierarchyResult {
  id: number
  level: HierarchyOrderLevel
  parentId: number | null
  departmentId: number | null
  subDepartmentId: number | null
  name: string
  code: string
  breadcrumb: string[]
  raw: Record<string, any>
}

const DISPLAY_ORDER_API = '/api/product-hierarchy/display-order'
const GLOBAL_SEARCH_API = '/api/product-hierarchy/display-order/search'
const PAGE_SIZE = 500

const { $axios } = useNuxtApp() as any
const flash = useFlashStore()

const makePane = (level: HierarchyOrderLevel): PaneState => ({
  level,
  rows: [],
  search: '',
  loading: false,
  busy: false,
  error: '',
  page: 0,
  lastPage: 1,
  total: 0,
  revision: null,
  requestId: 0,
})

const departmentPane = reactive<PaneState>(makePane('department'))
const subDepartmentPane = reactive<PaneState>(makePane('sub_department'))
const subSubDepartmentPane = reactive<PaneState>(makePane('sub_sub_department'))

const selectedDepartmentId = ref<number | null>(null)
const selectedSubDepartmentId = ref<number | null>(null)
const selectedSubSubDepartmentId = ref<number | null>(null)
const initialising = ref(true)
const lastSavedMove = ref<SavedHierarchyMove | null>(null)
const latestHierarchyRevision = ref<number | null>(null)
const hierarchyActionAnnouncement = ref('')

const globalSearchBox = ref<HTMLElement | null>(null)
const globalQuery = ref('')
const globalResults = ref<GlobalHierarchyResult[]>([])
const globalSearching = ref(false)
const globalSearchOpen = ref(false)
const globalSearchError = ref('')
const globalSearchFallback = ref(false)
const globalRequestId = ref(0)

const searchTimers = new Map<HierarchyOrderLevel, ReturnType<typeof setTimeout>>()
let globalSearchTimer: ReturnType<typeof setTimeout> | null = null

const paneForLevel = (level: HierarchyOrderLevel) => {
  if (level === 'department') return departmentPane
  if (level === 'sub_department') return subDepartmentPane
  return subSubDepartmentPane
}

const invalidateOtherPanes = (loadedLevel: HierarchyOrderLevel) => {
  const staleMessage = 'Category order changed in another session. Reload this list before reordering.'
  for (const pane of [departmentPane, subDepartmentPane, subSubDepartmentPane]) {
    if (pane.level === loadedLevel) continue
    if (!pane.rows.length && !pane.loading && pane.page === 0) continue

    pane.requestId += 1
    pane.loading = false
    pane.revision = null
    pane.error = staleMessage
  }
}

const acceptTrustedMutationRevision = (
  revision: number,
  expectedRevision: number,
) => {
  const status = classifyHierarchyRevision(latestHierarchyRevision.value, revision)
  if (status === 'invalid' || status === 'stale') return false

  latestHierarchyRevision.value = revision
  for (const pane of [departmentPane, subDepartmentPane, subSubDepartmentPane]) {
    if (!pane.error && pane.revision === expectedRevision) {
      pane.revision = revision
    }
  }
  if (
    lastSavedMove.value
    && lastSavedMove.value.postRevision !== revision
  ) {
    lastSavedMove.value = null
  }
  return true
}

const acceptFetchedRevision = (level: HierarchyOrderLevel, revision: number) => {
  const previousRevision = latestHierarchyRevision.value
  const status = classifyHierarchyRevision(previousRevision, revision)
  if (status === 'invalid' || status === 'stale') return false

  const externallyAdvanced = previousRevision !== null && status === 'newer'
  latestHierarchyRevision.value = revision
  paneForLevel(level).revision = revision

  if (externallyAdvanced) {
    lastSavedMove.value = null
    invalidateOtherPanes(level)
    hierarchyActionAnnouncement.value = 'Category order changed elsewhere. Other loaded lists must be refreshed before reordering.'
  }

  return true
}

const selectedDepartment = computed(() => (
  departmentPane.rows.find(row => row.id === selectedDepartmentId.value) ?? null
))

const selectedSubDepartment = computed(() => (
  subDepartmentPane.rows.find(row => row.id === selectedSubDepartmentId.value) ?? null
))

const selectedSubSubDepartment = computed(() => (
  subSubDepartmentPane.rows.find(row => row.id === selectedSubSubDepartmentId.value) ?? null
))

const departmentContext = computed(() => (
  selectedDepartment.value?.name
  || (selectedDepartmentId.value ? 'Category #' + selectedDepartmentId.value : '')
))

const subDepartmentContext = computed(() => (
  selectedSubDepartment.value?.name
  || (selectedSubDepartmentId.value ? 'Subcategory #' + selectedSubDepartmentId.value : '')
))

const selectedPath = computed(() => [
  departmentContext.value,
  subDepartmentContext.value,
  selectedSubSubDepartment.value?.name || '',
].filter(Boolean))

const loadedCount = computed(() => (
  departmentPane.rows.length
  + subDepartmentPane.rows.length
  + subSubDepartmentPane.rows.length
))

const hierarchyMutationBusy = computed(() => (
  departmentPane.busy
  || subDepartmentPane.busy
  || subSubDepartmentPane.busy
))

const hasMore = (pane: PaneState) => pane.page < pane.lastPage

const parentIdForLevel = (level: HierarchyOrderLevel) => {
  if (level === 'sub_department') return selectedDepartmentId.value
  if (level === 'sub_sub_department') return selectedSubDepartmentId.value
  return null
}

const resetPane = (pane: PaneState) => {
  pane.requestId += 1
  pane.rows = []
  pane.loading = false
  pane.busy = false
  pane.error = ''
  pane.page = 0
  pane.lastPage = 1
  pane.total = 0
  pane.revision = null
}

type HierarchyOrderAction = 'load' | 'save' | 'undo' | 'reset'

const hierarchyOrderError = (error: unknown, action: HierarchyOrderAction) => apiErrorMessage(error, {
  fallback: action === 'load'
    ? 'The category display order could not be loaded.'
    : action === 'undo'
      ? 'The last move could not be undone.'
      : action === 'reset'
        ? 'The default display order could not be restored.'
        : 'The new display order could not be saved.',
  forbidden: action === 'load'
    ? 'Your account does not have permission to view the category display order.'
    : 'Your account can view categories but cannot change their display order.',
  validation: action === 'reset'
    ? 'This category scope is no longer valid. Refresh the list and try again.'
    : 'This move is no longer valid. Refresh the list and try again.',
  rateLimited: 'Too many order changes were made. Wait a moment and try again.',
  server: action === 'load'
    ? 'The server could not load this category level. Try again shortly.'
    : action === 'reset'
      ? 'The server could not reset this order. The current order was kept.'
      : 'The server could not save this change. The previous order has been restored.',
  network: action === 'load'
    ? 'The server could not be reached. Check your connection and try again.'
    : action === 'reset'
      ? 'The reset could not be confirmed. Refresh before making another order change.'
      : 'The server could not be reached. The previous order has been restored.',
})

const fetchPane = async (
  level: HierarchyOrderLevel,
  options: { reset?: boolean; staleRetry?: number } = {},
) => {
  const pane = paneForLevel(level)
  const reset = options.reset !== false
  const staleRetry = options.staleRetry ?? 0
  const parentId = parentIdForLevel(level)

  if (level !== 'department' && !parentId) {
    resetPane(pane)
    return false
  }

  const requestId = pane.requestId + 1
  pane.requestId = requestId
  pane.loading = true
  pane.error = ''


  const requestedPage = reset ? 1 : pane.page + 1

  try {
    const response = await $axios.get(DISPLAY_ORDER_API, {
      params: {
        level,
        parent_id: parentId || undefined,
        search: pane.search.trim() || undefined,
        per_page: PAGE_SIZE,
        page: requestedPage,
      },
    })

    if (pane.requestId !== requestId) return false

    const page = extractHierarchyOrderPage(response.data, level)
    const revisionStatus = classifyHierarchyRevision(
      latestHierarchyRevision.value,
      page.revision,
    )
    if (revisionStatus === 'invalid' || revisionStatus === 'stale') {
      if (staleRetry < 1) {
        flash.info('An outdated category response was ignored. Reloading the latest order.')
        return fetchPane(level, { staleRetry: staleRetry + 1 })
      }

      pane.error = 'The server returned an outdated category order. Try loading this list again.'
      hierarchyActionAnnouncement.value = 'An outdated category response was rejected. No category rows were changed.'
      return false
    }
    if (!reset && pane.revision === null) {
      return fetchPane(level, { staleRetry })
    }
    if (
      !reset
      && pane.revision !== null
      && page.revision !== null
      && pane.revision !== page.revision
    ) {
      flash.info('Category order changed while more items were loading. The latest list was reloaded.')
      return fetchPane(level, { staleRetry })
    }
    if (reset) {
      pane.rows = page.rows
    } else {
      const known = new Set(pane.rows.map(row => row.id))
      pane.rows = [
        ...pane.rows,
        ...page.rows.filter(row => !known.has(row.id)),
      ].map((row, index) => ({ ...row, displayOrder: index + 1 }))
    }

    pane.page = page.currentPage
    pane.lastPage = Math.max(page.lastPage, page.currentPage)
    pane.total = Math.max(page.total, pane.rows.length)
    if (page.revision) acceptFetchedRevision(level, page.revision)
    return true
  } catch (error) {
    if (pane.requestId !== requestId) return false
    pane.error = hierarchyOrderError(error, 'load')
    return false
  } finally {
    if (pane.requestId === requestId) pane.loading = false
  }
}

const selectSubDepartment = async (
  id: number,
  preferredLeafId: number | null = null,
) => {
  selectedSubDepartmentId.value = id
  selectedSubSubDepartmentId.value = null
  resetPane(subSubDepartmentPane)

  const loaded = await fetchPane('sub_sub_department')
  if (!loaded) return

  const leafId = preferredLeafId
    ?? subSubDepartmentPane.rows[0]?.id
    ?? null
  selectedSubSubDepartmentId.value = leafId
}

const selectDepartment = async (
  id: number,
  preferredSubDepartmentId: number | null = null,
  preferredLeafId: number | null = null,
) => {
  selectedDepartmentId.value = id
  selectedSubDepartmentId.value = null
  selectedSubSubDepartmentId.value = null
  resetPane(subDepartmentPane)
  resetPane(subSubDepartmentPane)

  const loaded = await fetchPane('sub_department')
  if (!loaded) return

  const childId = preferredSubDepartmentId
    ?? subDepartmentPane.rows[0]?.id
    ?? null
  if (childId) await selectSubDepartment(childId, preferredLeafId)
}

const loadMorePane = (level: HierarchyOrderLevel) => {
  const pane = paneForLevel(level)
  if (pane.loading) return
  if (pane.error || !pane.revision) {
    fetchPane(level)
    return
  }
  if (!hasMore(pane)) return
  fetchPane(level, { reset: false })
}

const retryPane = (level: HierarchyOrderLevel) => {
  fetchPane(level)
}

const scopeKeyForLevel = (level: HierarchyOrderLevel) => {
  try {
    return hierarchyOrderScopeKey(level, parentIdForLevel(level))
  } catch {
    return ''
  }
}

const reorderDisabledReason = (pane: PaneState) => {
  if (pane.search.trim()) return 'Clear this filter before reordering all siblings.'
  if (hasMore(pane)) return 'Load every sibling before reordering this level.'
  if (pane.loading) return 'Wait for this level to finish loading.'
  if (hierarchyMutationBusy.value) return 'Wait for the current order change to finish.'
  if (pane.error) return 'Reload this list before reordering.'
  if (!pane.revision) return 'Refresh this list before reordering.'
  return ''
}

const canReorderPane = (pane: PaneState) => (
  !pane.search.trim()
  && !hasMore(pane)
  && !pane.loading
  && !hierarchyMutationBusy.value
  && !pane.error
  && Number.isInteger(pane.revision)
  && Number(pane.revision) > 0
)

const undoEntryForPane = (pane: PaneState) => {
  if (!lastSavedMove.value) return null
  return lastSavedMove.value.scopeKey === scopeKeyForLevel(pane.level)
    ? lastSavedMove.value
    : null
}

const canUndoPane = (pane: PaneState) => {
  const entry = undoEntryForPane(pane)
  return Boolean(
    entry
    && canReorderPane(pane)
    && pane.revision === entry.postRevision
    && pane.rows.some(row => row.id === entry.id)
    && (entry.beforeId === null || pane.rows.some(row => row.id === entry.beforeId)),
  )
}

const undoDisabledReason = (pane: PaneState) => {
  const entry = undoEntryForPane(pane)
  if (!lastSavedMove.value) return 'There is no saved move to undo.'
  if (!entry) return 'The last saved move belongs to another category list.'
  if (pane.revision !== entry.postRevision) return 'This list changed after the saved move.'
  return reorderDisabledReason(pane) || 'The saved move can no longer be undone from this list.'
}

const canResetPane = (pane: PaneState) => (
  !pane.search.trim()
  && !pane.loading
  && !hierarchyMutationBusy.value
  && !pane.error
  && Number.isInteger(pane.revision)
  && Number(pane.revision) > 0
  && (pane.level === 'department' || Boolean(parentIdForLevel(pane.level)))
  && Math.max(pane.total, pane.rows.length) > 1
)

const resetDisabledReason = (pane: PaneState) => {
  if (pane.level !== 'department' && !parentIdForLevel(pane.level)) {
    return pane.level === 'sub_department'
      ? 'Select a category before resetting its subcategories.'
      : 'Select a subcategory before resetting its sub-subcategories.'
  }
  if (pane.search.trim()) return 'Clear this filter before resetting the full list.'
  if (pane.loading) return 'Wait for this level to finish loading.'
  if (hierarchyMutationBusy.value) return 'Wait for the current order change to finish.'
  if (pane.error) return 'Reload this list before resetting it.'
  if (!pane.revision) return 'Refresh this list before resetting it.'
  if (Math.max(pane.total, pane.rows.length) < 2) return 'This list has no alternate order to reset.'
  return ''
}

const reloadAfterConflict = async (level: HierarchyOrderLevel) => {
  lastSavedMove.value = null
  await fetchPane(level)
}

const handleMove = async (
  level: HierarchyOrderLevel,
  move: { id: number; beforeId: number | null },
) => {
  const pane = paneForLevel(level)
  if (!canReorderPane(pane)) {
    flash.warning(reorderDisabledReason(pane) || 'This list is not ready to reorder.')
    return
  }

  const parentId = parentIdForLevel(level)
  const previous = pane.rows.map(row => ({ ...row }))
  const inverse = buildHierarchyUndoMove(previous, move.id)
  const movedName = previous.find(row => row.id === move.id)?.name || 'Category'
  const revision = pane.revision
  if (!revision) {
    flash.warning('Refresh this list before reordering.')
    return
  }

  try {
    pane.rows = moveBeforeSibling(pane.rows, move.id, move.beforeId)
    pane.busy = true
    const response = await $axios.patch(
      DISPLAY_ORDER_API,
      buildHierarchyMovePayload(level, move.id, move.beforeId, revision),
    )
    const nextRevision = Number(response.data?.meta?.revision)
    const acceptedRevision = Number.isInteger(nextRevision)
      && nextRevision > 0
      && acceptTrustedMutationRevision(nextRevision, revision)
    const trustedRevision = acceptedRevision
      && pane.revision === nextRevision
    if (!trustedRevision) {
      await fetchPane(level)
    }
    if (response.data?.meta?.moved !== false && trustedRevision && pane.revision) {
      lastSavedMove.value = {
        level,
        parentId,
        scopeKey: hierarchyOrderScopeKey(level, parentId),
        id: inverse.id,
        beforeId: inverse.beforeId,
        name: movedName,
        postRevision: pane.revision,
      }
    }
    flash.success('Category display order saved.')
    hierarchyActionAnnouncement.value = `${movedName} order saved. Undo is available in this list.`
  } catch (error: any) {
    pane.rows = previous
    if (Number(error?.response?.status ?? 0) === 409) {
      flash.warning(
        'Category order changed in another session. The latest order has been reloaded; try your move again.',
      )
      hierarchyActionAnnouncement.value = 'The order changed elsewhere. The latest list was reloaded.'
      await reloadAfterConflict(level)
    } else {
      flash.error(hierarchyOrderError(error, 'save'))
      hierarchyActionAnnouncement.value = 'The move was not saved. The previous order was restored.'
    }
  } finally {
    pane.busy = false
  }
}

const handleUndo = async (level: HierarchyOrderLevel) => {
  const pane = paneForLevel(level)
  const entry = undoEntryForPane(pane)
  if (!entry || !canUndoPane(pane)) {
    flash.warning(undoDisabledReason(pane))
    return
  }

  const revision = pane.revision
  if (!revision) {
    flash.warning('Refresh this list before undoing the move.')
    return
  }

  const previous = pane.rows.map(row => ({ ...row }))
  try {
    pane.rows = moveBeforeSibling(pane.rows, entry.id, entry.beforeId)
    pane.busy = true
    const response = await $axios.patch(
      DISPLAY_ORDER_API,
      buildHierarchyMovePayload(level, entry.id, entry.beforeId, revision),
    )
    const nextRevision = Number(response.data?.meta?.revision)
    const trustedRevision = Number.isInteger(nextRevision)
      && acceptTrustedMutationRevision(nextRevision, revision)
      && pane.revision === nextRevision
    if (!trustedRevision) {
      await fetchPane(level)
    }
    lastSavedMove.value = null
    flash.success(`The last move for ${entry.name} was undone.`)
    hierarchyActionAnnouncement.value = `${entry.name} returned to its previous position.`
  } catch (error: any) {
    pane.rows = previous
    if (Number(error?.response?.status ?? 0) === 409) {
      flash.warning(
        'Category order changed in another session. Undo was cancelled and the latest list was reloaded.',
      )
      hierarchyActionAnnouncement.value = 'Undo was cancelled because the list changed elsewhere.'
      await reloadAfterConflict(level)
    } else {
      flash.error(hierarchyOrderError(error, 'undo'))
      hierarchyActionAnnouncement.value = 'Undo was not saved. You can try again.'
    }
  } finally {
    pane.busy = false
  }
}

const resetCopy = (level: HierarchyOrderLevel, count: number) => {
  if (level === 'department') {
    return {
      title: 'Reset category order?',
      message: `Restore all ${count.toLocaleString()} categories to their original imported sequence?`,
    }
  }
  if (level === 'sub_department') {
    return {
      title: 'Reset subcategory order?',
      message: `Restore all ${count.toLocaleString()} subcategories inside “${departmentContext.value}” to their original imported sequence?`,
    }
  }
  return {
    title: 'Reset sub-subcategory order?',
    message: `Restore all ${count.toLocaleString()} sub-subcategories inside “${subDepartmentContext.value}” to their original imported sequence?`,
  }
}

const handleReset = async (level: HierarchyOrderLevel) => {
  const pane = paneForLevel(level)
  if (!canResetPane(pane)) {
    flash.warning(resetDisabledReason(pane))
    return
  }

  const count = Math.max(pane.total, pane.rows.length)
  const confirmedScopeKey = scopeKeyForLevel(level)
  const copy = resetCopy(level, count)
  const confirmed = await flash.confirm({
    title: copy.title,
    message: copy.message,
    confirmText: 'Reset order',
    cancelText: 'Keep current order',
  })
  if (!confirmed) {
    hierarchyActionAnnouncement.value = 'Reset cancelled. The current order was kept.'
    return
  }
  if (scopeKeyForLevel(level) !== confirmedScopeKey) {
    flash.warning('The selected category list changed. Review it before resetting the order.')
    hierarchyActionAnnouncement.value = 'Reset cancelled because the selected category list changed.'
    return
  }
  if (!canResetPane(pane) || !pane.revision) {
    flash.warning(resetDisabledReason(pane) || 'Refresh this list before resetting it.')
    return
  }

  const parentId = parentIdForLevel(level)
  const revision = pane.revision
  try {
    pane.busy = true
    const response = await $axios.post(
      `${DISPLAY_ORDER_API}/reset`,
      buildHierarchyResetPayload(level, parentId, revision),
    )
    const nextRevision = Number(response.data?.meta?.revision)
    const wasReset = response.data?.meta?.changed !== false
    if (Number.isInteger(nextRevision) && nextRevision > 0) {
      if (!acceptTrustedMutationRevision(nextRevision, revision)) {
        hierarchyActionAnnouncement.value = 'The reset response was older than the latest known category order. Reloading.'
      }
    }
    lastSavedMove.value = null
    await fetchPane(level)

    if (wasReset) {
      flash.success('The original imported order was restored.')
      hierarchyActionAnnouncement.value = 'The original imported order was restored for this list.'
    } else {
      flash.info('This list is already using its original imported order.')
      hierarchyActionAnnouncement.value = 'This list is already using its original imported order.'
    }
  } catch (error: any) {
    if (Number(error?.response?.status ?? 0) === 409) {
      flash.warning(
        'Category order changed in another session. Reset was cancelled and the latest list was reloaded.',
      )
      hierarchyActionAnnouncement.value = 'Reset was cancelled because the list changed elsewhere.'
      await reloadAfterConflict(level)
    } else {
      flash.error(hierarchyOrderError(error, 'reset'))
      hierarchyActionAnnouncement.value = 'The list was not reset. Its current order was kept.'
    }
  } finally {
    pane.busy = false
  }
}

const schedulePaneSearch = (level: HierarchyOrderLevel) => {
  const existing = searchTimers.get(level)
  if (existing) clearTimeout(existing)

  searchTimers.set(level, setTimeout(() => {
    searchTimers.delete(level)
    fetchPane(level)
  }, 300))
}

watch(() => departmentPane.search, () => schedulePaneSearch('department'))
watch(() => subDepartmentPane.search, () => schedulePaneSearch('sub_department'))
watch(() => subSubDepartmentPane.search, () => schedulePaneSearch('sub_sub_department'))

const searchResultLevel = (raw: any, fallback?: HierarchyOrderLevel) => {
  const value = String(raw?.level ?? raw?.type ?? fallback ?? 'department')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

  if (value === 'subdepartment' || value === 'subcategory') return 'sub_department'
  if (value === 'subsubdepartment' || value === 'subsubcategory') {
    return 'sub_sub_department'
  }
  return normalizeHierarchyLevel(value, fallback ?? 'department') as HierarchyOrderLevel
}

const resultRows = (payload: any): Array<{ raw: any; level?: HierarchyOrderLevel }> => {
  const source = payload?.data ?? payload
  if (Array.isArray(source)) return source.map(raw => ({ raw }))
  if (Array.isArray(source?.results)) return source.results.map((raw: any) => ({ raw }))
  if (Array.isArray(source?.items)) return source.items.map((raw: any) => ({ raw }))

  const grouped: Array<{ raw: any; level?: HierarchyOrderLevel }> = []
  const groups: Array<[string, HierarchyOrderLevel]> = [
    ['departments', 'department'],
    ['sub_departments', 'sub_department'],
    ['sub_sub_departments', 'sub_sub_department'],
  ]

  for (const [key, level] of groups) {
    const rows = source?.[key]
    if (Array.isArray(rows)) {
      grouped.push(...rows.map(raw => ({ raw, level })))
    }
  }
  return grouped
}

const nestedId = (raw: any, key: string) => {
  const value = Number(raw?.[key]?.id)
  return Number.isInteger(value) && value > 0 ? value : null
}

const optionalPositiveId = (...values: any[]) => {
  for (const value of values) {
    const parsed = Number(value)
    if (Number.isInteger(parsed) && parsed > 0) return parsed
  }
  return null
}

const normaliseGlobalResult = (
  raw: any,
  fallback?: HierarchyOrderLevel,
): GlobalHierarchyResult | null => {
  try {
    const level = searchResultLevel(raw, fallback)
    const row = normalizeHierarchyOrderRow(raw, level)
    const departmentId = level === 'department'
      ? row.id
      : optionalPositiveId(
        raw?.department_id,
        raw?.Products_Departments_Id,
        nestedId(raw, 'department'),
        level === 'sub_department' ? row.parentId : null,
      )
    const subDepartmentId = level === 'sub_department'
      ? row.id
      : optionalPositiveId(
        raw?.sub_department_id,
        raw?.Product_Sub_Department_Id,
        nestedId(raw, 'sub_department'),
        level === 'sub_sub_department' ? row.parentId : null,
      )
    const explicitBreadcrumb = Array.isArray(raw?.breadcrumb)
      ? raw.breadcrumb.map((value: any) => String(value)).filter(Boolean)
      : String(raw?.path ?? '')
        .split(/\s*(?:>|\/|→)\s*/)
        .map((value: string) => value.trim())
        .filter(Boolean)
    const breadcrumb = explicitBreadcrumb.length
      ? explicitBreadcrumb
      : [
          raw?.department_name,
          level === 'sub_sub_department' ? raw?.sub_department_name : null,
        ].map(value => String(value ?? '').trim()).filter(Boolean)

    return {
      id: row.id,
      level,
      parentId: row.parentId,
      departmentId,
      subDepartmentId,
      name: row.name,
      code: row.code,
      breadcrumb,
      raw,
    }
  } catch {
    return null
  }
}

const localSearchResults = (query: string) => {
  const panes = [departmentPane, subDepartmentPane, subSubDepartmentPane]
  return panes.flatMap(pane => (
    filterHierarchyOrderRows(pane.rows, query)
      .map(row => normaliseGlobalResult(row.raw ?? row, pane.level))
      .filter((row): row is GlobalHierarchyResult => Boolean(row))
  )).slice(0, 24)
}

const searchAllLevels = async () => {
  const query = globalQuery.value.trim()
  const requestId = globalRequestId.value + 1
  globalRequestId.value = requestId
  globalSearchError.value = ''
  globalSearchFallback.value = false

  if (query.length < 2) {
    globalResults.value = []
    globalSearching.value = false
    return
  }

  globalSearching.value = true
  try {
    const response = await $axios.get(GLOBAL_SEARCH_API, { params: { q: query } })
    if (globalRequestId.value !== requestId) return

    const seen = new Set<string>()
    globalResults.value = resultRows(response.data)
      .map(item => normaliseGlobalResult(item.raw, item.level))
      .filter((item): item is GlobalHierarchyResult => Boolean(item))
      .filter((item) => {
        const key = item.level + ':' + item.id
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 50)
  } catch (error: any) {
    if (globalRequestId.value !== requestId) return
    globalSearchFallback.value = true
    globalResults.value = localSearchResults(query)
    if (Number(error?.response?.status ?? 0) !== 404) {
      globalSearchError.value = 'Showing matches from the currently loaded categories.'
    }
  } finally {
    if (globalRequestId.value === requestId) globalSearching.value = false
  }
}

watch(globalQuery, () => {
  globalSearchOpen.value = true
  if (globalSearchTimer) clearTimeout(globalSearchTimer)
  globalSearchTimer = setTimeout(searchAllLevels, 300)
})

const focusGlobalResult = async (result: GlobalHierarchyResult) => {
  globalSearchOpen.value = false

  if (result.level === 'department') {
    await selectDepartment(result.id)
    return
  }

  if (result.level === 'sub_department') {
    if (!result.departmentId) {
      flash.error('This search result does not include its parent category.')
      return
    }
    await selectDepartment(result.departmentId, result.id)
    return
  }

  if (!result.departmentId || !result.subDepartmentId) {
    flash.error('This search result does not include its full category path.')
    return
  }
  await selectDepartment(result.departmentId, result.subDepartmentId, result.id)
}

const levelLabel = (level: HierarchyOrderLevel) => {
  if (level === 'department') return 'Category'
  if (level === 'sub_department') return 'Subcategory'
  return 'Sub-subcategory'
}

const onDocumentPointerDown = (event: PointerEvent) => {
  if (!globalSearchBox.value?.contains(event.target as Node)) {
    globalSearchOpen.value = false
  }
}

onMounted(async () => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  const loaded = await fetchPane('department')
  if (loaded && departmentPane.rows[0]) {
    await selectDepartment(departmentPane.rows[0].id)
  }
  initialising.value = false
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  for (const timer of searchTimers.values()) clearTimeout(timer)
  if (globalSearchTimer) clearTimeout(globalSearchTimer)
})
</script>

<template>
  <div class="dashboard-main-body hierarchy-order-page">
    <span class="visually-hidden" aria-live="polite">
      {{ hierarchyActionAnnouncement }}
    </span>
    <header class="hierarchy-order-hero">
      <div>
        <h1>Category display order</h1>
        <p>
          Arrange the storefront hierarchy. Every move is saved immediately and stays within
          the selected parent.
        </p>
      </div>

      <div class="hierarchy-order-hero__status" aria-live="polite">
        <span class="hierarchy-order-hero__pulse" aria-hidden="true" />
        <span>
          <strong>{{ loadedCount.toLocaleString() }}</strong>
          categories loaded in this workspace
        </span>
      </div>
    </header>

    <section class="hierarchy-toolbar" aria-label="Category ordering tools">
      <div ref="globalSearchBox" class="hierarchy-global-search">
        <label for="hierarchy-global-query">Find anywhere in the hierarchy</label>
        <div class="hierarchy-global-search__input">
          <iconify-icon icon="solar:magnifer-linear" aria-hidden="true" />
          <input
            id="hierarchy-global-query"
            v-model="globalQuery"
            type="search"
            autocomplete="off"
            placeholder="Search by English, Arabic, or category code"
            @focus="globalSearchOpen = true"
            @keydown.esc="globalSearchOpen = false"
          >
          <span v-if="globalSearching" class="hierarchy-global-search__spinner" aria-hidden="true" />
          <button
            v-else-if="globalQuery"
            type="button"
            aria-label="Clear hierarchy search"
            title="Clear search"
            @click="globalQuery = ''"
          >
            <iconify-icon icon="solar:close-circle-linear" aria-hidden="true" />
          </button>
        </div>

        <div
          v-if="globalSearchOpen && globalQuery.trim().length >= 2"
          class="hierarchy-global-results"
        >
          <div v-if="globalSearching && !globalResults.length" class="hierarchy-global-results__state">
            Searching every category level...
          </div>
          <template v-else-if="globalResults.length">
            <button
              v-for="result in globalResults"
              :key="result.level + '-' + result.id"
              type="button"
              class="hierarchy-global-result"
              @mousedown.prevent
              @click="focusGlobalResult(result)"
            >
              <span class="hierarchy-global-result__icon">
                <iconify-icon
                  :icon="result.level === 'department'
                    ? 'solar:folder-with-files-linear'
                    : result.level === 'sub_department'
                      ? 'solar:folder-2-linear'
                      : 'solar:document-linear'"
                  aria-hidden="true"
                />
              </span>
              <span class="hierarchy-global-result__body">
                <span>
                  <strong>{{ result.name || 'Unnamed category' }}</strong>
                  <small>{{ levelLabel(result.level) }}</small>
                </span>
                <code>{{ result.code || 'No code' }}</code>
                <em v-if="result.breadcrumb.length">{{ result.breadcrumb.join(' / ') }}</em>
              </span>
              <iconify-icon icon="solar:arrow-right-linear" aria-hidden="true" />
            </button>
          </template>
          <div v-else class="hierarchy-global-results__state">
            <iconify-icon icon="solar:magnifer-linear" aria-hidden="true" />
            <strong>No matching categories</strong>
            <span>Try another name, Arabic label, or code.</span>
          </div>
          <p v-if="globalSearchFallback || globalSearchError" class="hierarchy-global-results__note">
            <iconify-icon icon="solar:info-circle-linear" aria-hidden="true" />
            {{ globalSearchError || 'Search is limited to categories loaded in this workspace.' }}
          </p>
        </div>
      </div>

      <div class="hierarchy-toolbar__guidance">
        <span class="hierarchy-toolbar__drag">
          <iconify-icon icon="solar:hamburger-menu-linear" aria-hidden="true" />
        </span>
        <span>
          <strong>Drag, type a position, or use arrow controls</strong>
          Reordering pauses while a pane is filtered or partially loaded.
        </span>
      </div>
    </section>

    <nav class="hierarchy-context" aria-label="Selected category path">
      <span class="hierarchy-context__label">Current context</span>
      <template v-if="selectedPath.length">
        <template v-for="(part, index) in selectedPath" :key="part + '-' + index">
          <iconify-icon
            v-if="index"
            icon="solar:alt-arrow-right-linear"
            aria-hidden="true"
          />
          <span :class="{ 'hierarchy-context__current': index === selectedPath.length - 1 }">
            {{ part }}
          </span>
        </template>
      </template>
      <span v-else class="hierarchy-context__empty">
        Select a category to start exploring its hierarchy.
      </span>
    </nav>

    <div v-if="initialising" class="hierarchy-order-initial" role="status">
      <span class="hierarchy-global-search__spinner" aria-hidden="true" />
      Preparing the hierarchy workspace...
    </div>

    <div class="hierarchy-order-grid">
      <ClientOnly>
        <AdminHierarchyOrderColumn
          title="Categories"
          subtitle="Storefront root categories"
          :rows="departmentPane.rows"
          :selected-id="selectedDepartmentId"
          v-model:search="departmentPane.search"
          :loading="departmentPane.loading"
          :error="departmentPane.error"
          :busy="departmentPane.busy"
          :total="departmentPane.total"
          :has-more="hasMore(departmentPane)"
          :drag-disabled="!canReorderPane(departmentPane)"
          :drag-disabled-reason="reorderDisabledReason(departmentPane)"
          :can-undo="canUndoPane(departmentPane)"
          :undo-disabled-reason="undoDisabledReason(departmentPane)"
          :can-reset="canResetPane(departmentPane)"
          :reset-disabled-reason="resetDisabledReason(departmentPane)"
          empty-title="No categories found"
          :empty-copy="departmentPane.search
            ? 'No categories match this filter.'
            : 'Create or import a product category before arranging it.'"
          @select="selectDepartment"
          @move="handleMove('department', $event)"
          @undo="handleUndo('department')"
          @reset="handleReset('department')"
          @retry="retryPane('department')"
          @load-more="loadMorePane('department')"
        />
        <template #fallback>
          <div class="hierarchy-order-placeholder">Loading category controls...</div>
        </template>
      </ClientOnly>

      <ClientOnly>
        <AdminHierarchyOrderColumn
          title="Subcategories"
          :subtitle="selectedDepartmentId
            ? 'Inside ' + departmentContext
            : 'Select a category first'"
          :rows="subDepartmentPane.rows"
          :selected-id="selectedSubDepartmentId"
          v-model:search="subDepartmentPane.search"
          :loading="subDepartmentPane.loading"
          :error="subDepartmentPane.error"
          :busy="subDepartmentPane.busy"
          :total="subDepartmentPane.total"
          :has-more="hasMore(subDepartmentPane)"
          :drag-disabled="!selectedDepartmentId || !canReorderPane(subDepartmentPane)"
          :drag-disabled-reason="reorderDisabledReason(subDepartmentPane)"
          :can-undo="canUndoPane(subDepartmentPane)"
          :undo-disabled-reason="undoDisabledReason(subDepartmentPane)"
          :can-reset="canResetPane(subDepartmentPane)"
          :reset-disabled-reason="resetDisabledReason(subDepartmentPane)"
          :empty-title="selectedDepartmentId ? 'No subcategories found' : 'Choose a category'"
          :empty-copy="selectedDepartmentId
            ? (subDepartmentPane.search
              ? 'No subcategories match this filter.'
              : 'This category has no subcategories yet.')
            : 'The selected category’s children will appear here.'"
          @select="selectSubDepartment"
          @move="handleMove('sub_department', $event)"
          @undo="handleUndo('sub_department')"
          @reset="handleReset('sub_department')"
          @retry="retryPane('sub_department')"
          @load-more="loadMorePane('sub_department')"
        />
        <template #fallback>
          <div class="hierarchy-order-placeholder">Loading subcategory controls...</div>
        </template>
      </ClientOnly>

      <ClientOnly>
        <AdminHierarchyOrderColumn
          title="Sub-subcategories"
          :subtitle="selectedSubDepartmentId
            ? 'Inside ' + subDepartmentContext
            : 'Select a subcategory first'"
          :rows="subSubDepartmentPane.rows"
          :selected-id="selectedSubSubDepartmentId"
          v-model:search="subSubDepartmentPane.search"
          :loading="subSubDepartmentPane.loading"
          :error="subSubDepartmentPane.error"
          :busy="subSubDepartmentPane.busy"
          :total="subSubDepartmentPane.total"
          :has-more="hasMore(subSubDepartmentPane)"
          :drag-disabled="!selectedSubDepartmentId || !canReorderPane(subSubDepartmentPane)"
          :drag-disabled-reason="reorderDisabledReason(subSubDepartmentPane)"
          :can-undo="canUndoPane(subSubDepartmentPane)"
          :undo-disabled-reason="undoDisabledReason(subSubDepartmentPane)"
          :can-reset="canResetPane(subSubDepartmentPane)"
          :reset-disabled-reason="resetDisabledReason(subSubDepartmentPane)"
          :empty-title="selectedSubDepartmentId ? 'No sub-subcategories found' : 'Choose a subcategory'"
          :empty-copy="selectedSubDepartmentId
            ? (subSubDepartmentPane.search
              ? 'No sub-subcategories match this filter.'
              : 'This subcategory has no sub-subcategories yet.')
            : 'The final category level will appear here.'"
          @select="selectedSubSubDepartmentId = $event"
          @move="handleMove('sub_sub_department', $event)"
          @undo="handleUndo('sub_sub_department')"
          @reset="handleReset('sub_sub_department')"
          @retry="retryPane('sub_sub_department')"
          @load-more="loadMorePane('sub_sub_department')"
        />
        <template #fallback>
          <div class="hierarchy-order-placeholder">Loading sub-subcategory controls...</div>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>

<style scoped>
.hierarchy-order-page {
  --hierarchy-accent: #2563eb;
  --hierarchy-border: #e2e8f0;
  --hierarchy-muted: #64748b;
  --hierarchy-surface: #ffffff;
  min-width: 0;
}

.hierarchy-order-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.hierarchy-order-hero h1 {
  margin: 0;
  color: #172033;
  font-size: clamp(1.05rem, 1.6vw, 1.25rem) !important;
  line-height: 1.3 !important;
  font-weight: 750;
  letter-spacing: -0.025em;
}

.hierarchy-order-hero p {
  max-width: 45rem;
  margin: 0.35rem 0 0;
  color: var(--hierarchy-muted);
  font-size: 0.82rem;
  line-height: 1.55;
}

.hierarchy-order-hero__status {
  display: flex;
  flex: none;
  align-items: center;
  gap: 0.65rem;
  border: 1px solid #bfdbfe;
  border-radius: 0.7rem;
  background: #eff6ff;
  padding: 0.65rem 0.85rem;
  color: #475569;
  font-size: 0.72rem;
}

.hierarchy-order-hero__status strong {
  color: #1d4ed8;
}

.hierarchy-order-hero__pulse {
  width: 0.5rem;
  height: 0.5rem;
  border: 2px solid #dbeafe;
  border-radius: 999px;
  background: #2563eb;
  box-shadow: 0 0 0 3px rgb(37 99 235 / 0.12);
}

.hierarchy-toolbar {
  position: relative;
  z-index: 20;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.8rem;
  border: 1px solid var(--hierarchy-border);
  border-radius: 0.9rem;
  background: var(--hierarchy-surface);
  padding: 0.85rem 1rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.03);
}

.hierarchy-global-search {
  position: relative;
  width: min(36rem, 58%);
}

.hierarchy-global-search > label {
  display: block;
  margin-bottom: 0.35rem;
  color: #334155;
  font-size: 0.7rem;
  font-weight: 700;
}

.hierarchy-global-search__input {
  display: flex;
  height: 2.7rem;
  align-items: center;
  gap: 0.55rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.7rem;
  padding: 0 0.8rem;
  color: #64748b;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.hierarchy-global-search__input:focus-within {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgb(59 130 246 / 0.12);
}

.hierarchy-global-search__input > iconify-icon {
  flex: none;
  font-size: 1.15rem;
}

.hierarchy-global-search__input input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #0f172a;
  font-size: 0.78rem;
}

.hierarchy-global-search__input input::placeholder {
  color: #94a3b8;
}

.hierarchy-global-search__input button {
  display: inline-flex;
  width: 1.7rem;
  height: 1.7rem;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 0.4rem;
  background: transparent;
  color: #64748b;
  font-size: 1.1rem;
}

.hierarchy-global-search__input button:hover {
  background: #f1f5f9;
  color: #334155;
}

.hierarchy-global-search__spinner {
  display: inline-block;
  width: 0.95rem;
  height: 0.95rem;
  flex: none;
  border: 2px solid #bfdbfe;
  border-top-color: #2563eb;
  border-radius: 999px;
  animation: hierarchy-page-spin 700ms linear infinite;
}

.hierarchy-global-results {
  position: absolute;
  top: calc(100% + 0.45rem);
  right: 0;
  left: 0;
  max-height: min(28rem, 62vh);
  overflow-y: auto;
  border: 1px solid var(--hierarchy-border);
  border-radius: 0.75rem;
  background: #fff;
  box-shadow: 0 18px 45px rgb(15 23 42 / 0.16);
}

.hierarchy-global-result {
  display: grid;
  width: 100%;
  grid-template-columns: 2rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.65rem;
  border: 0;
  border-bottom: 1px solid #f1f5f9;
  padding: 0.72rem 0.8rem;
  background: #fff;
  color: #334155;
  text-align: left;
}

.hierarchy-global-result:hover,
.hierarchy-global-result:focus-visible {
  outline: 0;
  background: #f8fbff;
}

.hierarchy-global-result__icon {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.55rem;
  background: #eff6ff;
  color: #2563eb;
  font-size: 1.05rem;
}

.hierarchy-global-result__body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.14rem;
}

.hierarchy-global-result__body > span {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
}

.hierarchy-global-result__body strong {
  overflow: hidden;
  color: #172033;
  font-size: 0.76rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hierarchy-global-result__body small {
  flex: none;
  border-radius: 999px;
  background: #f1f5f9;
  padding: 0.12rem 0.4rem;
  color: #64748b;
  font-size: 0.58rem;
  font-weight: 700;
}

.hierarchy-global-result__body code,
.hierarchy-global-result__body em {
  overflow: hidden;
  color: #64748b;
  font-size: 0.63rem;
  font-style: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hierarchy-global-result__body code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.hierarchy-global-result > iconify-icon {
  color: #94a3b8;
}

.hierarchy-global-results__state {
  display: flex;
  min-height: 7rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  color: #64748b;
  text-align: center;
}

.hierarchy-global-results__state iconify-icon {
  margin-bottom: 0.4rem;
  font-size: 1.4rem;
}

.hierarchy-global-results__state strong {
  color: #334155;
  font-size: 0.78rem;
}

.hierarchy-global-results__state span,
.hierarchy-global-results__state {
  font-size: 0.7rem;
}

.hierarchy-global-results__note {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  border-top: 1px solid #fef3c7;
  background: #fffbeb;
  padding: 0.55rem 0.75rem;
  color: #92400e;
  font-size: 0.65rem;
}

.hierarchy-toolbar__guidance {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  color: #64748b;
  font-size: 0.7rem;
  line-height: 1.35;
}

.hierarchy-toolbar__guidance strong {
  display: block;
  color: #334155;
  font-size: 0.72rem;
}

.hierarchy-toolbar__drag {
  display: inline-flex;
  width: 2.3rem;
  height: 2.3rem;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 0.65rem;
  background: #f1f5f9;
  color: #475569;
  font-size: 1.15rem;
}

.hierarchy-context {
  display: flex;
  min-height: 2.65rem;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.8rem;
  overflow-x: auto;
  border: 1px solid var(--hierarchy-border);
  border-radius: 0.75rem;
  background: #fff;
  padding: 0.5rem 0.8rem;
  color: #64748b;
  font-size: 0.72rem;
  white-space: nowrap;
}

.hierarchy-context__label {
  margin-right: 0.2rem;
  color: #94a3b8;
  font-size: 0.63rem;
  font-weight: 700;
  letter-spacing: 0.055em;
  text-transform: uppercase;
}

.hierarchy-context iconify-icon {
  flex: none;
  color: #cbd5e1;
}

.hierarchy-context__current {
  color: #1d4ed8;
  font-weight: 700;
}

.hierarchy-context__empty {
  color: #94a3b8;
}

.hierarchy-order-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
}

.hierarchy-order-initial {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.65rem;
  color: #64748b;
  font-size: 0.7rem;
}

.hierarchy-order-placeholder {
  display: flex;
  min-height: 34rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--hierarchy-border);
  border-radius: 0.9rem;
  background: #fff;
  color: #64748b;
  font-size: 0.75rem;
}

@keyframes hierarchy-page-spin {
  to { transform: rotate(360deg); }
}

:global(.dark) .hierarchy-order-page {
  --hierarchy-border: #273244;
  --hierarchy-muted: #94a3b8;
  --hierarchy-surface: #182235;
}

:global(.dark) .hierarchy-order-hero h1,
:global(.dark) .hierarchy-global-search > label,
:global(.dark) .hierarchy-global-search__input input,
:global(.dark) .hierarchy-toolbar__guidance strong,
:global(.dark) .hierarchy-global-result__body strong {
  color: #e2e8f0;
}

:global(.dark) .hierarchy-order-hero__status {
  border-color: #334c73;
  background: rgb(37 99 235 / 0.12);
  color: #cbd5e1;
}

:global(.dark) .hierarchy-global-results,
:global(.dark) .hierarchy-global-result,
:global(.dark) .hierarchy-context,
:global(.dark) .hierarchy-order-placeholder {
  background: #182235;
}

:global(.dark) .hierarchy-global-result {
  border-bottom-color: #273244;
  color: #cbd5e1;
}

:global(.dark) .hierarchy-global-result:hover,
:global(.dark) .hierarchy-global-result:focus-visible {
  background: #1d2a40;
}

:global(.dark) .hierarchy-global-result__body small,
:global(.dark) .hierarchy-toolbar__drag,
:global(.dark) .hierarchy-global-search__input button:hover {
  background: #253147;
  color: #cbd5e1;
}

@media (max-width: 1199px) {
  .hierarchy-order-grid {
    grid-template-columns: 1fr;
  }

  .hierarchy-order-hero {
    align-items: stretch;
  }

  .hierarchy-order-hero__status {
    align-self: flex-start;
  }
}

@media (max-width: 767px) {
  .hierarchy-order-hero,
  .hierarchy-toolbar {
    flex-direction: column;
  }

  .hierarchy-order-hero__status,
  .hierarchy-global-search {
    width: 100%;
  }

  .hierarchy-toolbar {
    align-items: stretch;
  }

  .hierarchy-toolbar__guidance {
    align-items: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hierarchy-global-search__input {
    transition: none;
  }
}
</style>
