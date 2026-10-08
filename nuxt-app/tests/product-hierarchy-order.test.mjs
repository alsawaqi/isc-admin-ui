import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildHierarchyMovePayload,
  buildHierarchyResetPayload,
  buildHierarchyUndoMove,
  classifyHierarchyRevision,
  extractHierarchyOrderPage,
  filterHierarchyOrderRows,
  hierarchyDragAutoScrollDelta,
  hierarchyOrderScopeKey,
  moveBeforeSibling,
  moveHierarchyRow,
  moveHierarchyRowToPosition,
  normalizeHierarchyOrderRows,
} from '../utils/productHierarchyOrder.js'

const rows = () => normalizeHierarchyOrderRows([
  {
    id: 10,
    level: 'sub_department',
    Products_Departments_Id: 7,
    Sub_Department_Name: 'Air Compressors',
    Sub_Department_Name_Ar: 'ضواغط الهواء',
    Products_Sub_Department_Code: 'SUBDEPT_2026_AUG_SUB_000010',
    Display_Order: 1,
  },
  {
    id: 20,
    level: 'sub_department',
    Products_Departments_Id: 7,
    Sub_Department_Name: 'Pneumatic Valves',
    Products_Sub_Department_Code: 'SUBDEPT_2026_AUG_SUB_000020',
    Display_Order: 2,
  },
  {
    id: 30,
    level: 'sub_department',
    Products_Departments_Id: 7,
    Sub_Department_Name: 'Air Filters',
    Products_Sub_Department_Code: 'SUBDEPT_2026_AUG_SUB_000030',
    Display_Order: 3,
  },
], 'sub_department')

test('same-parent reorder moves before an anchor and renumbers the visible siblings', () => {
  const reordered = moveBeforeSibling(rows(), 30, 10)

  assert.deepEqual(reordered.map(row => row.id), [30, 10, 20])
  assert.deepEqual(reordered.map(row => row.displayOrder), [1, 2, 3])
})

test('reorder refuses an anchor from another parent', () => {
  const mixedRows = [
    ...rows(),
    {
      ...rows()[0],
      id: 99,
      parentId: 8,
    },
  ]

  assert.throws(
    () => moveBeforeSibling(mixedRows, 10, 99),
    /same parent/i,
  )
  assert.throws(
    () => moveBeforeSibling(mixedRows, 10, null),
    /same parent/i,
  )
})

test('accessible move actions calculate the backend before anchor', () => {
  const down = moveHierarchyRow(rows(), 10, 'down')
  assert.deepEqual(down.rows.map(row => row.id), [20, 10, 30])
  assert.equal(down.beforeId, 30)

  const bottom = moveHierarchyRow(rows(), 10, 'bottom')
  assert.deepEqual(bottom.rows.map(row => row.id), [20, 30, 10])
  assert.equal(bottom.beforeId, null)
})

test('numeric positions move rows to the requested final position', () => {
  const first = moveHierarchyRowToPosition(rows(), 30, 1)
  assert.deepEqual(first.rows.map(row => row.id), [30, 10, 20])
  assert.equal(first.beforeId, 10)

  const middle = moveHierarchyRowToPosition(rows(), 10, 2)
  assert.deepEqual(middle.rows.map(row => row.id), [20, 10, 30])
  assert.equal(middle.beforeId, 30)

  const last = moveHierarchyRowToPosition(rows(), 10, 3)
  assert.deepEqual(last.rows.map(row => row.id), [20, 30, 10])
  assert.equal(last.beforeId, null)
  assert.deepEqual(last.rows.map(row => row.displayOrder), [1, 2, 3])
})

test('numeric positions reject invalid values and preserve no-op moves', () => {
  const unchanged = moveHierarchyRowToPosition(rows(), 20, 2)
  assert.equal(unchanged.changed, false)
  assert.deepEqual(unchanged.rows.map(row => row.id), [10, 20, 30])
  assert.equal(unchanged.beforeId, 30)

  for (const position of [0, -1, 1.5, 4, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => moveHierarchyRowToPosition(rows(), 20, position),
      /between 1 and 3/i,
    )
  }
  assert.throws(
    () => moveHierarchyRowToPosition(rows(), 999, 1),
    /not found/i,
  )
})

test('numeric positions cannot reorder a mixed-parent list', () => {
  const mixedRows = [
    ...rows(),
    { ...rows()[0], id: 99, parentId: 8 },
  ]

  assert.throws(
    () => moveHierarchyRowToPosition(mixedRows, 10, 4),
    /same parent/i,
  )
})

test('undo anchors restore first, middle, and last moves exactly', () => {
  for (const [movedId, beforeId] of [
    [10, null],
    [20, 10],
    [30, 10],
  ]) {
    const original = rows()
    const undo = buildHierarchyUndoMove(original, movedId)
    const moved = moveBeforeSibling(original, movedId, beforeId)
    const restored = moveBeforeSibling(moved, undo.id, undo.beforeId)

    assert.deepEqual(restored.map(row => row.id), original.map(row => row.id))
    assert.deepEqual(restored.map(row => row.displayOrder), [1, 2, 3])
  }

  assert.deepEqual(buildHierarchyUndoMove(rows(), 10), { id: 10, beforeId: 20 })
  assert.deepEqual(buildHierarchyUndoMove(rows(), 20), { id: 20, beforeId: 30 })
  assert.deepEqual(buildHierarchyUndoMove(rows(), 30), { id: 30, beforeId: null })
})

test('undo anchors reject missing rows and mixed parent scopes', () => {
  assert.throws(() => buildHierarchyUndoMove(rows(), 999), /not found/i)
  assert.throws(
    () => buildHierarchyUndoMove([
      ...rows(),
      { ...rows()[0], id: 99, parentId: 8 },
    ], 10),
    /same parent/i,
  )
})

test('hierarchy scope keys distinguish every level and parent', () => {
  assert.equal(hierarchyOrderScopeKey('department', null), 'department:root')
  assert.equal(hierarchyOrderScopeKey('sub_department', 7), 'sub_department:7')
  assert.equal(hierarchyOrderScopeKey('sub_sub_department', 9), 'sub_sub_department:9')
  assert.notEqual(
    hierarchyOrderScopeKey('sub_department', 7),
    hierarchyOrderScopeKey('sub_department', 8),
  )
  assert.throws(() => hierarchyOrderScopeKey('department', 7), /cannot have a parent/i)
  assert.throws(() => hierarchyOrderScopeKey('sub_department', null), /positive parent id/i)
})

test('reset payload preserves exact scope and revision contract', () => {
  assert.deepEqual(
    buildHierarchyResetPayload('department', null, 4),
    { level: 'department', parent_id: null, revision: 4 },
  )
  assert.deepEqual(
    buildHierarchyResetPayload('sub_department', 7, 5),
    { level: 'sub_department', parent_id: 7, revision: 5 },
  )
  assert.deepEqual(
    buildHierarchyResetPayload('sub_sub_department', 9, 6),
    { level: 'sub_sub_department', parent_id: 9, revision: 6 },
  )
  assert.throws(() => buildHierarchyResetPayload('department', 7, 4), /cannot have a parent/i)
  assert.throws(() => buildHierarchyResetPayload('sub_department', null, 4), /positive parent id/i)
  assert.throws(() => buildHierarchyResetPayload('sub_department', 7, 0), /revision/i)
})

test('revision classification never accepts a lower or invalid GET revision', () => {
  assert.equal(classifyHierarchyRevision(null, 7), 'newer')
  assert.equal(classifyHierarchyRevision(7, 7), 'current')
  assert.equal(classifyHierarchyRevision(7, 8), 'newer')
  assert.equal(classifyHierarchyRevision(7, 6), 'stale')
  assert.equal(classifyHierarchyRevision(7, null), 'invalid')
  assert.equal(classifyHierarchyRevision(7, 0), 'invalid')
  assert.equal(classifyHierarchyRevision(7, Number.NaN), 'invalid')
})

test('drag auto-scroll speed is directional, proportional, and bounded', () => {
  const options = { edge: 60, maxSpeed: 24 }

  assert.equal(hierarchyDragAutoScrollDelta(100, 0, 200, options), 0)
  assert.equal(hierarchyDragAutoScrollDelta(0, 0, 200, options), -24)
  assert.equal(hierarchyDragAutoScrollDelta(200, 0, 200, options), 24)
  assert.equal(hierarchyDragAutoScrollDelta(50, 0, 200, options), -4)
  assert.equal(hierarchyDragAutoScrollDelta(150, 0, 200, options), 4)
  assert.equal(hierarchyDragAutoScrollDelta(-50, 0, 200, options), -24)
  assert.equal(hierarchyDragAutoScrollDelta(250, 0, 200, options), 24)
})

test('drag auto-scroll handles short and invalid scroll areas safely', () => {
  assert.equal(hierarchyDragAutoScrollDelta(0, 0, 40, { edge: 60, maxSpeed: 20 }), -20)
  assert.equal(hierarchyDragAutoScrollDelta(40, 0, 40, { edge: 60, maxSpeed: 20 }), 20)
  assert.equal(hierarchyDragAutoScrollDelta(10, 20, 20), 0)
  assert.equal(hierarchyDragAutoScrollDelta(Number.NaN, 0, 200), 0)
  assert.equal(hierarchyDragAutoScrollDelta(10, 0, 200, { edge: 0 }), 0)
})

test('move payload uses the exact level/id/before_id/revision API contract', () => {
  assert.deepEqual(
    buildHierarchyMovePayload('sub_sub_department', 42, 84, 7),
    { level: 'sub_sub_department', id: 42, before_id: 84, revision: 7 },
  )
  assert.deepEqual(
    buildHierarchyMovePayload('department', 42, null, 7),
    { level: 'department', id: 42, before_id: null, revision: 7 },
  )
  assert.throws(
    () => buildHierarchyMovePayload('department', 42, 42, 7),
    /before itself/i,
  )
  assert.throws(
    () => buildHierarchyMovePayload('department', 42, null, 0),
    /revision/i,
  )
})

test('backend page envelopes preserve pagination and revision metadata', () => {
  const page = extractHierarchyOrderPage({
    data: [rows()[0].raw],
    meta: {
      current_page: 2,
      last_page: 4,
      total: 1600,
      revision: 7,
    },
  }, 'sub_department')

  assert.equal(page.rows.length, 1)
  assert.equal(page.currentPage, 2)
  assert.equal(page.lastPage, 4)
  assert.equal(page.total, 1600)
  assert.equal(page.revision, 7)
})

test('search matches English, Arabic, and category codes without changing order', () => {
  assert.deepEqual(
    filterHierarchyOrderRows(rows(), 'compressors').map(row => row.id),
    [10],
  )
  assert.deepEqual(
    filterHierarchyOrderRows(rows(), 'ضواغط').map(row => row.id),
    [10],
  )
  assert.deepEqual(
    filterHierarchyOrderRows(rows(), '000030').map(row => row.id),
    [30],
  )
})
