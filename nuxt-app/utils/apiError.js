const DEFAULT_MESSAGES = Object.freeze({
  fallback: 'The request could not be completed. Please try again.',
  unauthenticated: 'Your session has expired. Sign in and try again.',
  forbidden: 'You do not have permission to perform this action.',
  payloadTooLarge: 'The uploaded file is too large.',
  validation: 'Some of the submitted information is not valid.',
  rateLimited: 'Too many requests were made. Wait a moment and try again.',
  server: 'The server could not complete the request. Please try again later.',
  network: 'The server could not be reached. Check your connection and try again.',
})

const genericServerMessages = new Set([
  'server error',
  'internal server error',
  'something went wrong',
])

const usefulMessage = (value) => {
  if (typeof value !== 'string') return ''

  const message = value.trim()
  if (!message || genericServerMessages.has(message.replace(/[.!]+$/, '').toLowerCase())) return ''

  return message
}

const firstValidationError = (errors) => {
  if (!errors || typeof errors !== 'object') return ''

  for (const value of Object.values(errors)) {
    const candidates = Array.isArray(value) ? value : [value]
    const first = candidates.map(usefulMessage).find(Boolean)
    if (first) return first
  }

  return ''
}

export const apiErrorMessage = (error, options = {}) => {
  const messages = { ...DEFAULT_MESSAGES, ...options }
  const response = error?.response
  const status = Number(response?.status ?? 0)
  const data = response?.data

  if (status === 401 || status === 419) return messages.unauthenticated
  if (status === 403) return messages.forbidden
  if (status === 413) return messages.payloadTooLarge

  if (status === 422) {
    return firstValidationError(data?.errors)
      || usefulMessage(data?.message)
      || messages.validation
  }

  if (status === 429) return messages.rateLimited
  if (status >= 500) return messages.server

  if (!response) {
    const localMessage = error?.isAxiosError ? '' : usefulMessage(error?.message)
    return localMessage || messages.network
  }

  return usefulMessage(data?.message) || messages.fallback
}
