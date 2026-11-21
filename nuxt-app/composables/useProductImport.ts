import { onBeforeUnmount, shallowRef } from 'vue'
import { useNuxtApp } from '#imports'
import { apiErrorMessage } from '~/utils/apiError'
import type { ImportHistory, ImportLookup, ImportOptions, ImportPreview, ImportReceipt, ImportRollback } from '~/types/productImport'

export function useProductImport() {
  const { $axios } = useNuxtApp() as any
  const preview = shallowRef<ImportPreview | null>(null)
  const receipt = shallowRef<ImportReceipt | null>(null)
  const busy = shallowRef<'preview' | 'commit' | 'rollback' | null>(null)
  const undoNotice = shallowRef('')
  const error = shallowRef('')
  const lookups = shallowRef<{ types: ImportLookup[]; brands: ImportLookup[]; can_create_brands: boolean }>({ types: [], brands: [], can_create_brands: false })
  const history = shallowRef<ImportHistory[]>([])
  let controller: AbortController | null = null
  let generation = 0
  const invalidate = () => { generation++; controller?.abort(); preview.value = null; receipt.value = null; busy.value = null; error.value = '' }
  const load = async () => {
    try {
      const catalog = await $axios.get('/api/product-import/lookups')
      lookups.value = catalog.data.data
    } catch (e) { error.value = apiErrorMessage(e, { fallback: 'Could not load the import settings. Please reload this page.' }) }
  }
  const loadHistory = async () => {
    try {
      const jobs = await $axios.get('/api/product-import/history')
      history.value = jobs.data.data
    } catch (e) { error.value = apiErrorMessage(e, { fallback: 'Could not load imports. Please reload this page.' }) }
  }
  const inspect = async (file: File, options: ImportOptions) => {
    invalidate(); const current = generation; controller = new AbortController(); busy.value = 'preview'
    const body = new FormData(); body.append('file', file); body.append('options', JSON.stringify(options))
    try {
      const result = await $axios.post('/api/product-import/preview', body, { signal: controller.signal })
      if (current === generation) preview.value = result.data.data
    } catch (e) { if (current === generation) error.value = apiErrorMessage(e, { fallback: 'The workbook could not be checked.' }) }
    finally { if (current === generation) busy.value = null }
  }
  const commit = async () => {
    if (!preview.value?.can_commit || busy.value) return
    busy.value = 'commit'; error.value = ''
    try {
      const response = await $axios.post('/api/product-import/commit', { preview_token: preview.value.preview_token })
      receipt.value = response.data.data; preview.value = null
      await load()
    } catch (e) {
      const uncertain = 'Import was not confirmed. Retry this same preview safely; do not start a different import until its result is known.'
      error.value = apiErrorMessage(e, { fallback: uncertain, server: uncertain, network: uncertain })
    } finally { busy.value = null }
  }
  const rollback = async (jobId: number) => {
    if (busy.value) return
    busy.value = 'rollback'; error.value = ''; undoNotice.value = ''
    try {
      const response = await $axios.post('/api/product-import/rollback', { job_id: jobId, confirm: true })
      const result: ImportRollback = response.data.data
      preview.value = null
      if (Number(receipt.value?.job_id) === jobId) receipt.value = null
      undoNotice.value = `Import #${jobId} undone. Reversed ${result.updates_reversed ?? 0} updates. Removed ${result.products_removed} products and ${result.brands_removed} unused brands.${result.brands_retained ? ` Kept ${result.brands_retained} brands that are used, changed, or require brand permission.` : ''}`
      await loadHistory()
    } catch (e) {
      const uncertain = 'Undo was not confirmed. Retry this same import safely to check its result.'
      error.value = apiErrorMessage(e, { fallback: uncertain, server: uncertain, network: uncertain })
    } finally { busy.value = null }
  }
  onBeforeUnmount(() => { controller?.abort() })
  return { preview, receipt, busy, error, lookups, history, undoNotice, invalidate, load, loadHistory, inspect, commit, rollback }
}
