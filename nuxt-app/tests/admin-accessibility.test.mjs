import test from 'node:test'
import assert from 'node:assert/strict'
import {
  adminActionLabel,
  adminStatusClass,
  adminStatusLabel,
  isKeyboardActivation,
  tableNavigationLabel,
} from '../utils/adminAccessibility.js'

test('admin statuses are readable and mapped to contrast-safe classes', () => {
  assert.equal(adminStatusLabel('ready_for_collection'), 'Ready For Collection')
  assert.equal(adminStatusLabel('on-hold'), 'On Hold')
  assert.equal(adminStatusClass('cancelled'), 'status-danger')
  assert.equal(adminStatusClass('delivered'), 'status-success')
  assert.equal(adminStatusClass(null), 'status-neutral')
})

test('admin table actions and navigation expose useful labels', () => {
  assert.equal(adminActionLabel('View details', 'ORD-1002'), 'View details for ORD-1002')
  assert.equal(tableNavigationLabel('Completed orders', 2, 4), 'Completed orders page 2 of 4')
})

test('keyboard activation supports enter and space only', () => {
  assert.equal(isKeyboardActivation({ key: 'Enter' }), true)
  assert.equal(isKeyboardActivation({ key: ' ' }), true)
  assert.equal(isKeyboardActivation({ key: 'Tab' }), false)
})
