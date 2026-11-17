import { onBeforeUnmount, shallowRef } from 'vue'
import { useNuxtApp } from '#imports'
import { apiErrorMessage } from '~/utils/apiError'
import type { ImportLookup, ImportOptions, ImportPreview, ImportReceipt } from '~/types/productImport'

export function useProductImport() {
  const { $axios } = useNuxtApp() as any
  const preview = shallowRef<ImportPreview | null>(null)
  const receipt = shallowRef<ImportReceipt | null>(null)
  const busy = shallowRef<'preview' | 'commit' | null>(null)
  const error = shallowRef('')
  const lookups = shallowRef<{ types: ImportLookup[]; brands: ImportLookup[]; can_create_brands: boolean }>({ types: [], brands: [], can_create_brands: false })
  const history = shallowRef<{ id: number; File_Name: string; Committed_At: string; Result: ImportReceipt }[]>([])
  let controller: AbortController | null = null
  let generation = 0
  const invalidate = () => { generation++; controller?.abort(); preview.value = null; receipt.value = null; busy.value = null; error.value = '' }
  const load = async () => {
    try {
      const [catalog, jobs] = await Promise.all([$axios.get('/api/product-import/lookups'), $axios.get('/api/product-import/history')])
      lookups.value = catalog.data.data; history.value = jobs.data.data
    } catch (e) { error.value = apiErrorMessage(e, { fallback: 'Could not load the import settings. Please reload this page.' }) }
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
  onBeforeUnmount(() => { controller?.abort() })
  return { preview, receipt, busy, error, lookups, history, invalidate, load, inspect, commit }
}
