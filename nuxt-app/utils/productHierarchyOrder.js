const LEVELS = new Set(['department', 'sub_department', 'sub_sub_department'])

const LEVEL_FIELD_MAP = {
  department: {
    name: ['name', 'Product_Department_Name', 'department_name'],
    nameAr: ['name_ar', 'Product_Department_Name_Ar', 'department_name_ar'],
    code: ['code', 'Product_Department_Code', 'department_code'],
    parentId: [],
  },
  sub_department: {
    name: ['name', 'Sub_Department_Name', 'sub_department_name'],
    nameAr: ['name_ar', 'Sub_Department_Name_Ar', 'sub_department_name_ar'],
    code: ['code', 'Products_Sub_Department_Code', 'sub_department_code'],
    parentId: ['parent_id', 'Products_Departments_Id', 'department_id'],
  },
  sub_sub_department: {
    name: ['name', 'Product_Sub_Sub_Department_Name', 'sub_sub_department_name'],
    nameAr: ['name_ar', 'Product_Sub_Sub_Department_Name_Ar', 'sub_sub_department_name_ar'],
    code: ['code', 'Product_Sub_Sub_Department_Code', 'sub_sub_department_code'],
    parentId: ['parent_id', 'Product_Sub_Department_Id', 'sub_department_id'],
  },
}

const firstValue = (source, keys) => {
  for (const key of keys) {
    if (source?.[key] !== undefined && source[key] !== null) return source[key]
  }
  return null
}

const optionalNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const normalizeHierarchyLevel = (value, fallback = 'department') => {
  const level = String(value || fallback).trim().toLowerCase()
  return LEVELS.has(level) ? level : fallback
}

export const normalizeHierarchyOrderRow = (raw, fallbackLevel = 'department', index = 0) => {
  const level = normalizeHierarchyLevel(raw?.level, fallbackLevel)
  const fields = LEVEL_FIELD_MAP[level]
  const id = Number(firstValue(raw, ['id', 'ID']))

  if (!Number.isInteger(id) || id < 1) {
    throw new TypeError('Hierarchy order rows require a positive integer id.')
  }

  const displayOrder = optionalNumber(firstValue(raw, [
    'display_order',
    'Display_Order',
    'sort_order',
    'position',
  ]))
  const explicitBreadcrumb = Array.isArray(raw?.breadcrumb)
    ? raw.breadcrumb.map(value => String(value)).filter(Boolean)
    : []
  const fallbackBreadcrumb = [
    raw?.department_name,
    level === 'sub_sub_department' ? raw?.sub_department_name : null,
  ].map(value => String(value ?? '').trim()).filter(Boolean)

  return {
    id,
    level,
    parentId: level === 'department' ? null : optionalNumber(firstValue(raw, fields.parentId)),
    name: String(firstValue(raw, fields.name) ?? '').trim(),
    nameAr: String(firstValue(raw, fields.nameAr) ?? '').trim(),
    code: String(firstValue(raw, fields.code) ?? '').trim(),
    displayOrder: displayOrder ?? index + 1,
    childCount: optionalNumber(firstValue(raw, [
      'child_count',
      'children_count',
      'sub_departments_count',
      'sub_sub_departments_count',
    ])) ?? 0,
    breadcrumb: explicitBreadcrumb.length ? explicitBreadcrumb : fallbackBreadcrumb,
    raw,
  }
}

export const normalizeHierarchyOrderRows = (rows, level) => {
  if (!Array.isArray(rows)) return []

  return rows
    .map((row, index) => normalizeHierarchyOrderRow(row, level, index))
    .sort((left, right) => (
      Number(left.displayOrder) - Number(right.displayOrder)
      || Number(left.id) - Number(right.id)
    ))
    .map((row, index) => ({ ...row, displayOrder: index + 1 }))
}

export const extractHierarchyOrderPage = (payload, level) => {
  const responseBody = payload ?? {}
  const nested = !Array.isArray(responseBody) ? responseBody?.data : null
  const root = (
    nested
    && typeof nested === 'object'
    && !Array.isArray(nested)
    && (
      Array.isArray(nested.data)
      || Array.isArray(nested.items)
      || Array.isArray(nested.rows)
    )
  ) ? nested : responseBody
  const rows = Array.isArray(root)
    ? root
    : (Array.isArray(root?.data) ? root.data : (root?.items ?? root?.rows ?? []))
  const meta = Array.isArray(root) ? {} : (root?.meta ?? root)
  const currentPage = Number(meta?.current_page ?? meta?.currentPage ?? 1) || 1
  const lastPage = Number(meta?.last_page ?? meta?.lastPage ?? currentPage) || currentPage
  const total = Number(meta?.total ?? rows.length) || 0
  const revision = Number(meta?.revision ?? root?.revision ?? 0)

  return {
    rows: normalizeHierarchyOrderRows(rows, level),
    currentPage,
    lastPage,
    total,
    revision: Number.isInteger(revision) && revision > 0 ? revision : null,
  }
}

const searchText = value => String(value ?? '')
  .normalize('NFKC')
  .toLocaleLowerCase()
  .replace(/\s+/g, ' ')
  .trim()

export const hierarchyRowMatchesSearch = (row, query) => {
  const needle = searchText(query)
  if (!needle) return true

  return [
    row?.name,
    row?.nameAr,
    row?.code,
    ...(Array.isArray(row?.breadcrumb) ? row.breadcrumb : []),
  ].some(value => searchText(value).includes(needle))
}

export const filterHierarchyOrderRows = (rows, query) => (
  (Array.isArray(rows) ? rows : []).filter(row => hierarchyRowMatchesSearch(row, query))
)

export const classifyHierarchyRevision = (knownRevision, candidateRevision) => {
  const known = Number(knownRevision)
  const candidate = Number(candidateRevision)
  const hasKnown = Number.isInteger(known) && known > 0
  const hasCandidate = Number.isInteger(candidate) && candidate > 0

  if (!hasCandidate) return 'invalid'
  if (!hasKnown) return 'newer'
  if (candidate < known) return 'stale'
  if (candidate > known) return 'newer'
  return 'current'
}

export const hierarchyOrderScopeKey = (level, parentId = null) => {
  const normalizedLevel = normalizeHierarchyLevel(level, '')
  if (!LEVELS.has(normalizedLevel)) {
    throw new TypeError('A valid hierarchy level is required.')
  }

  if (normalizedLevel === 'department') {
    if (parentId !== null && parentId !== undefined && parentId !== '') {
      throw new TypeError('Root categories cannot have a parent scope.')
    }
    return 'department:root'
  }

  const normalizedParentId = Number(parentId)
  if (!Number.isInteger(normalizedParentId) || normalizedParentId < 1) {
    throw new TypeError('A positive parent id is required for this hierarchy scope.')
  }

  return normalizedLevel + ':' + normalizedParentId
}

const scopeKey = row => hierarchyOrderScopeKey(row?.level, row?.parentId)

export const moveBeforeSibling = (rows, movedId, beforeId = null) => {
  const source = Array.isArray(rows) ? rows : []
  const movedIndex = source.findIndex(row => Number(row.id) === Number(movedId))
  if (movedIndex < 0) throw new RangeError('The moved hierarchy item was not found.')

  const moved = source[movedIndex]
  if (source.some(row => scopeKey(row) !== scopeKey(moved))) {
    throw new TypeError('Hierarchy items can only be reordered within the same parent.')
  }
  if (beforeId !== null && Number(beforeId) === Number(movedId)) {
    return source.map((row, index) => ({ ...row, displayOrder: index + 1 }))
  }

  const anchor = beforeId === null
    ? null
    : source.find(row => Number(row.id) === Number(beforeId))
  if (beforeId !== null && !anchor) {
    throw new RangeError('The hierarchy anchor item was not found.')
  }
  if (anchor && scopeKey(anchor) !== scopeKey(moved)) {
    throw new TypeError('Hierarchy items can only be reordered within the same parent.')
  }

  const next = source.filter(row => Number(row.id) !== Number(movedId))
  const insertAt = anchor
    ? next.findIndex(row => Number(row.id) === Number(anchor.id))
    : next.length
  next.splice(insertAt < 0 ? next.length : insertAt, 0, moved)

  return next.map((row, index) => ({ ...row, displayOrder: index + 1 }))
}

export const moveHierarchyRow = (rows, movedId, action) => {
  const source = Array.isArray(rows) ? rows : []
  const index = source.findIndex(row => Number(row.id) === Number(movedId))
  if (index < 0) throw new RangeError('The moved hierarchy item was not found.')

  let beforeId
  if (action === 'top') beforeId = source[0]?.id ?? null
  else if (action === 'up') beforeId = source[index - 1]?.id ?? source[index]?.id ?? null
  else if (action === 'down') beforeId = source[index + 2]?.id ?? null
  else if (action === 'bottom') beforeId = null
  else throw new TypeError('Unknown hierarchy move action.')

  const nextRows = moveBeforeSibling(source, movedId, beforeId)
  const nextIndex = nextRows.findIndex(row => Number(row.id) === Number(movedId))
  const changed = nextIndex !== index

  return {
    rows: nextRows,
    changed,
    beforeId: changed ? (nextRows[nextIndex + 1]?.id ?? null) : (source[index + 1]?.id ?? null),
  }
}

export const moveHierarchyRowToPosition = (rows, movedId, targetPosition) => {
  const source = Array.isArray(rows) ? rows : []
  const position = Number(targetPosition)
  const currentIndex = source.findIndex(row => Number(row.id) === Number(movedId))

  if (currentIndex < 0) throw new RangeError('The moved hierarchy item was not found.')
  if (!Number.isInteger(position) || position < 1 || position > source.length) {
    throw new RangeError(`The hierarchy position must be between 1 and ${source.length}.`)
  }

  const remaining = source.filter(row => Number(row.id) !== Number(movedId))
  const beforeId = remaining[position - 1]?.id ?? null
  const nextRows = moveBeforeSibling(source, movedId, beforeId)
  const nextIndex = nextRows.findIndex(row => Number(row.id) === Number(movedId))
  const changed = nextIndex !== currentIndex

  return {
    rows: nextRows,
    changed,
    beforeId: changed ? (nextRows[nextIndex + 1]?.id ?? null) : (source[currentIndex + 1]?.id ?? null),
  }
}

export const buildHierarchyUndoMove = (rows, movedId) => {
  const source = Array.isArray(rows) ? rows : []
  const movedIndex = source.findIndex(row => Number(row.id) === Number(movedId))
  if (movedIndex < 0) throw new RangeError('The moved hierarchy item was not found.')

  const moved = source[movedIndex]
  if (source.some(row => scopeKey(row) !== scopeKey(moved))) {
    throw new TypeError('Hierarchy items can only be reordered within the same parent.')
  }

  const normalizedId = Number(moved.id)
  const successorId = source[movedIndex + 1]?.id

  return {
    id: normalizedId,
    beforeId: successorId === undefined ? null : Number(successorId),
  }
}

export const hierarchyDragAutoScrollDelta = (
  pointerY,
  top,
  bottom,
  { edge = 72, maxSpeed = 18 } = {},
) => {
  const y = Number(pointerY)
  const start = Number(top)
  const end = Number(bottom)
  const requestedEdge = Number(edge)
  const requestedMaxSpeed = Number(maxSpeed)

  if (
    !Number.isFinite(y)
    || !Number.isFinite(start)
    || !Number.isFinite(end)
    || !Number.isFinite(requestedEdge)
    || !Number.isFinite(requestedMaxSpeed)
    || end <= start
    || requestedEdge <= 0
    || requestedMaxSpeed <= 0
  ) return 0

  const edgeSize = Math.min(requestedEdge, (end - start) / 2)
  const topLimit = start + edgeSize
  const bottomLimit = end - edgeSize

  if (y < topLimit) {
    const intensity = Math.min(1, (topLimit - y) / edgeSize)
    return -Math.ceil(requestedMaxSpeed * intensity)
  }
  if (y > bottomLimit) {
    const intensity = Math.min(1, (y - bottomLimit) / edgeSize)
    return Math.ceil(requestedMaxSpeed * intensity)
  }

  return 0
}

export const buildHierarchyMovePayload = (level, id, beforeId = null, revision) => {
  const normalizedLevel = normalizeHierarchyLevel(level, '')
  const normalizedId = Number(id)
  const normalizedBeforeId = beforeId === null ? null : Number(beforeId)
  const normalizedRevision = Number(revision)

  if (!LEVELS.has(normalizedLevel)) throw new TypeError('A valid hierarchy level is required.')
  if (!Number.isInteger(normalizedId) || normalizedId < 1) {
    throw new TypeError('A valid hierarchy item id is required.')
  }
  if (
    normalizedBeforeId !== null
    && (!Number.isInteger(normalizedBeforeId) || normalizedBeforeId < 1)
  ) {
    throw new TypeError('The hierarchy anchor id must be null or a positive integer.')
  }
  if (normalizedBeforeId === normalizedId) {
    throw new TypeError('A hierarchy item cannot be moved before itself.')
  }
  if (!Number.isInteger(normalizedRevision) || normalizedRevision < 1) {
    throw new TypeError('A valid hierarchy order revision is required.')
  }

  return {
    level: normalizedLevel,
    id: normalizedId,
    before_id: normalizedBeforeId,
    revision: normalizedRevision,
  }
}

export const buildHierarchyResetPayload = (level, parentId, revision) => {
  const normalizedLevel = normalizeHierarchyLevel(level, '')
  const normalizedRevision = Number(revision)

  if (!LEVELS.has(normalizedLevel)) throw new TypeError('A valid hierarchy level is required.')
  if (!Number.isInteger(normalizedRevision) || normalizedRevision < 1) {
    throw new TypeError('A valid hierarchy order revision is required.')
  }

  let normalizedParentId = null
  if (normalizedLevel === 'department') {
    hierarchyOrderScopeKey(normalizedLevel, parentId)
  } else {
    normalizedParentId = Number(parentId)
    hierarchyOrderScopeKey(normalizedLevel, normalizedParentId)
  }

  return {
    level: normalizedLevel,
    parent_id: normalizedParentId,
    revision: normalizedRevision,
  }
}
