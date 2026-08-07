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
