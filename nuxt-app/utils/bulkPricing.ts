// Bulk (quantity-tier) pricing helpers shared by the admin product pages.
//
// A tier is { min_qty: int >= 1, max_qty: int|null (null = open-ended "and above"),
// unit_price: decimal > 0 }. Tiers must not overlap; gaps are allowed. These
// client-side rules mirror App\Support\Pricing\BulkPriceRules on the API side.

export interface BulkTierRow {
  min_qty: number | null | ''
  max_qty: number | null | ''
  unit_price: number | null | ''
}

export interface BulkTierPayload {
  min_qty: number
  max_qty: number | null
  unit_price: number
}

const numOrNull = (v: any): number | null =>
  v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v)

const isBlank = (v: any): boolean => v === null || v === undefined || v === ''

/**
 * Accepts API rows in either casing ({ Min_Qty, Max_Qty, Unit_Price } from the
 * house tables or { min_qty, max_qty, unit_price } from display payloads) and
 * returns editor-friendly rows sorted by min qty.
 */
export const normalizeTiers = (raw: any): BulkTierRow[] => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((t: any) => ({
      min_qty: numOrNull(t?.min_qty ?? t?.Min_Qty),
      max_qty: numOrNull(t?.max_qty ?? t?.Max_Qty),
      unit_price: numOrNull(t?.unit_price ?? t?.Unit_Price),
    }))
    .sort((a, b) => (a.min_qty ?? 0) - (b.min_qty ?? 0))
}

/** Editor rows -> API payload ('' max qty becomes null = open-ended). */
export const tiersToPayload = (rows: BulkTierRow[]): BulkTierPayload[] =>
  rows.map(r => ({
    min_qty: Number(r.min_qty),
    max_qty: isBlank(r.max_qty) ? null : Number(r.max_qty),
    unit_price: Number(r.unit_price),
  }))

/** "5-10" for closed ranges, "51+" for open-ended ones. */
export const tierRangeLabel = (t: any): string => {
  const min = numOrNull(t?.min_qty ?? t?.Min_Qty)
  const max = numOrNull(t?.max_qty ?? t?.Max_Qty)
  if (min === null) return '-'
  return max === null ? `${min}+` : `${min}-${max}`
}

const fmtRange = (min: number, max: number | null): string =>
  max === null ? `${min}+` : `${min}-${max}`

/**
 * Validate a full tier set against the smart rules (min>=1, max>=min, price>0,
 * price >= floor when a floor exists, no overlapping ranges). Returns an array
 * of human-readable error strings; empty array = valid.
 */
export const validateTierRows = (
  rows: BulkTierRow[],
  floor?: number | null
): string[] => {
  const errors: string[] = []
  const parsed: Array<{ min: number; max: number | null }> = []

  rows.forEach((row, idx) => {
    const label = `Tier ${idx + 1}`
    const min = numOrNull(row.min_qty)
    const maxBlank = isBlank(row.max_qty)
    const max = maxBlank ? null : numOrNull(row.max_qty)
    const price = numOrNull(row.unit_price)

    let rangeOk = true

    if (min === null || !Number.isInteger(min) || min < 1) {
      errors.push(`${label}: min qty must be a whole number of at least 1.`)
      rangeOk = false
    }

    if (!maxBlank && (max === null || !Number.isInteger(max))) {
      errors.push(`${label}: max qty must be a whole number (leave blank for "and above").`)
      rangeOk = false
    } else if (max !== null && min !== null && max < min) {
      errors.push(`${label}: max qty (${max}) must be greater than or equal to min qty (${min}).`)
      rangeOk = false
    }

    if (price === null || price <= 0) {
      errors.push(`${label}: unit price must be greater than 0.`)
    } else if (floor !== null && floor !== undefined && price < Number(floor)) {
      errors.push(
        `${label}: unit price ${price.toFixed(3)} is below the minimum selling price (${Number(floor).toFixed(3)}).`
      )
    }

    if (rangeOk && min !== null) parsed.push({ min, max })
  })

  // No overlaps across the set (null max = infinity). Duplicates are overlaps.
  for (let i = 0; i < parsed.length; i++) {
    for (let j = i + 1; j < parsed.length; j++) {
      const a = parsed[i]
      const b = parsed[j]
      const aMax = a.max === null ? Infinity : a.max
      const bMax = b.max === null ? Infinity : b.max
      if (a.min <= bMax && b.min <= aMax) {
        errors.push(`Range ${fmtRange(a.min, a.max)} overlaps range ${fmtRange(b.min, b.max)}.`)
      }
    }
  }

  return errors
}
