export type HierarchyOrderLevel = 'department' | 'sub_department' | 'sub_sub_department'
export type HierarchyMoveAction = 'top' | 'up' | 'down' | 'bottom'

export type HierarchyOrderRow = {
  id: number
  level: HierarchyOrderLevel
  parentId: number | null
  name: string
  nameAr: string
  code: string
  displayOrder: number
  childCount: number
  breadcrumb: string[]
  raw: Record<string, unknown>
}

export type HierarchyOrderPage = {
  rows: HierarchyOrderRow[]
  currentPage: number
  lastPage: number
  total: number
  revision: number | null
}

export function normalizeHierarchyLevel(
  value: unknown,
  fallback?: HierarchyOrderLevel | '',
): HierarchyOrderLevel | ''
export function normalizeHierarchyOrderRow(
  raw: Record<string, unknown>,
  fallbackLevel?: HierarchyOrderLevel,
  index?: number,
): HierarchyOrderRow
export function normalizeHierarchyOrderRows(
  rows: unknown,
  level: HierarchyOrderLevel,
): HierarchyOrderRow[]
export function extractHierarchyOrderPage(
  payload: unknown,
  level: HierarchyOrderLevel,
): HierarchyOrderPage
export function hierarchyRowMatchesSearch(row: HierarchyOrderRow, query: string): boolean
export function filterHierarchyOrderRows(
  rows: HierarchyOrderRow[],
  query: string,
): HierarchyOrderRow[]
export function classifyHierarchyRevision(
  knownRevision: number | null,
  candidateRevision: number | null,
): 'invalid' | 'stale' | 'current' | 'newer'
export function hierarchyOrderScopeKey(
  level: HierarchyOrderLevel,
  parentId?: number | null,
): string
export function moveBeforeSibling(
  rows: HierarchyOrderRow[],
  movedId: number,
  beforeId?: number | null,
): HierarchyOrderRow[]
export function moveHierarchyRow(
  rows: HierarchyOrderRow[],
  movedId: number,
  action: HierarchyMoveAction,
): { rows: HierarchyOrderRow[]; changed: boolean; beforeId: number | null }
export function moveHierarchyRowToPosition(
  rows: HierarchyOrderRow[],
  movedId: number,
  targetPosition: number,
): { rows: HierarchyOrderRow[]; changed: boolean; beforeId: number | null }
export function buildHierarchyUndoMove(
  rows: HierarchyOrderRow[],
  movedId: number,
): { id: number; beforeId: number | null }
export function hierarchyDragAutoScrollDelta(
  pointerY: number,
  top: number,
  bottom: number,
  options?: { edge?: number; maxSpeed?: number },
): number
export function buildHierarchyMovePayload(
  level: HierarchyOrderLevel,
  id: number,
  beforeId: number | null,
  revision: number,
): {
  level: HierarchyOrderLevel
  id: number
  before_id: number | null
  revision: number
}
export function buildHierarchyResetPayload(
  level: HierarchyOrderLevel,
  parentId: number | null,
  revision: number,
): {
  level: HierarchyOrderLevel
  parent_id: number | null
  revision: number
}
