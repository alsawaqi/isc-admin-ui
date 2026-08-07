import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildHierarchyMovePayload,
  extractHierarchyOrderPage,
  filterHierarchyOrderRows,
  moveBeforeSibling,
  moveHierarchyRow,
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
