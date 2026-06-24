export const adminStatusLabel = (status) => {
  const raw = String(status || 'unknown').trim()
  if (!raw || raw === 'unknown') return 'Unknown'

  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export const adminStatusClass = (status) => {
  const value = String(status || '').toLowerCase()

  if (['delivered', 'completed', 'paid', 'approved', 'active', 'published'].includes(value)) return 'status-success'
  if (['pending', 'on-hold', 'packed', 'processing', 'scheduled', 'partially_refunded'].includes(value)) return 'status-warning'
  if (['cancelled', 'returned', 'failed', 'expired', 'rejected', 'refunded'].includes(value)) return 'status-danger'
  if (['dispatched', 'shipped', 'ready_for_collection'].includes(value)) return 'status-info'

  return 'status-neutral'
}

export const adminActionLabel = (action, subject) =>
  [action, subject ? `for ${subject}` : '']
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ')

export const tableNavigationLabel = (tableName, page, lastPage) =>
  `${tableName} page ${Number(page || 1)} of ${Number(lastPage || 1)}`

export const isKeyboardActivation = (event) => event?.key === 'Enter' || event?.key === ' '
