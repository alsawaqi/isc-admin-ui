import test from 'node:test'
import assert from 'node:assert/strict'
import { apiErrorMessage } from '../utils/apiError.js'

const responseError = (status, data = {}) => ({
  isAxiosError: true,
  response: { status, data },
})

test('authorization and session errors have clear status-specific messages', () => {
  assert.equal(
    apiErrorMessage(responseError(403, { message: 'Server Error' }), {
      forbidden: 'Your role cannot import product categories.',
    }),
    'Your role cannot import product categories.',
  )
  assert.equal(
    apiErrorMessage(responseError(401, { message: 'Server Error' })),
    'Your session has expired. Sign in and try again.',
  )
})

test('upload, validation, and rate-limit failures remain actionable', () => {
  assert.equal(
    apiErrorMessage(responseError(413), { payloadTooLarge: 'Choose a workbook no larger than 5 MB.' }),
    'Choose a workbook no larger than 5 MB.',
  )
  assert.equal(
    apiErrorMessage(responseError(422, { errors: { file: ['The workbook format is invalid.'] } })),
    'The workbook format is invalid.',
  )
  assert.equal(
    apiErrorMessage(responseError(422, { message: 'Server Error' }), {
      validation: 'Review the workbook and try again.',
    }),
    'Review the workbook and try again.',
  )
  assert.equal(
    apiErrorMessage(responseError(429)),
    'Too many requests were made. Wait a moment and try again.',
  )
})

test('server and network failures never expose a raw generic Server Error', () => {
  const serverMessage = apiErrorMessage(responseError(500, { message: 'Server Error' }), {
    server: 'The import service could not process the workbook.',
  })
  const networkMessage = apiErrorMessage({ isAxiosError: true, message: 'Network Error' }, {
    network: 'The import service could not be reached.',
  })

  assert.equal(serverMessage, 'The import service could not process the workbook.')
  assert.equal(networkMessage, 'The import service could not be reached.')
  assert.notEqual(serverMessage, 'Server Error')
  assert.notEqual(networkMessage, 'Server Error')
})

test('safe API and local parsing messages are preserved', () => {
  assert.equal(
    apiErrorMessage(responseError(409, { message: 'This preview has expired.' })),
    'This preview has expired.',
  )
  assert.equal(
    apiErrorMessage(new Error('The server returned an incomplete preview response.')),
    'The server returned an incomplete preview response.',
  )
})
