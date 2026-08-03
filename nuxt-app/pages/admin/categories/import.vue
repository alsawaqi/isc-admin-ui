<script setup lang="ts">
import { computed, ref } from 'vue'
import { definePageMeta, useNuxtApp } from '#imports'
import { useFlashStore } from '~/stores/flashs'

definePageMeta({
  layout: 'admin',
  middleware: ['permission'],
  permission: 'import product categories',
})

interface Counts {
  departments?: number
  sub_departments?: number
  sub_sub_departments?: number
}

interface ImportSummary {
  rows_total?: number
  rows_read?: number
  separator_rows?: number
  valid_paths?: number
  departments?: number
  sub_departments?: number
  sub_sub_departments?: number
  new_departments?: number
  new_sub_departments?: number
  new_sub_sub_departments?: number
  existing_departments?: number
  existing_sub_departments?: number
  existing_sub_sub_departments?: number
  duplicate_paths?: number
  ignored_rows?: number
  error_count?: number
  warning_count?: number
  create?: Counts
  existing?: Counts
}

interface ImportIssue {
  row?: number | null
  severity: string
  code?: string | null
  message: string
  path?: string | null
}

interface HierarchyLeaf {
  name: string
  status?: string
  code?: string | null
  canonical_code?: string
  sequence?: number
}

interface HierarchySubDepartment {
  name: string
  status?: string
  code?: string | null
  canonical_code?: string
  sequence?: number
  sub_sub_departments?: HierarchyLeaf[]
}

interface HierarchyDepartment {
  external_id?: string
  main_id?: string
  name: string
  status?: string
  code?: string | null
  canonical_code?: string
  main_sequence?: number
  sub_departments?: HierarchySubDepartment[]
}

interface PreviewData {
  preview_token: string
  code_period?: string
  expires_at?: string | null
  file?: { name?: string; size?: number; sheet?: string; sha256?: string }
  summary: ImportSummary
  can_commit: boolean
  issues_truncated?: boolean
  issues: ImportIssue[]
  hierarchy: HierarchyDepartment[]
}

interface CommitData {
  created?: Counts
  skipped?: Counts
  warnings?: Array<ImportIssue | string>
  errors?: number
}

type IssueFilter = 'all' | 'error' | 'warning' | 'duplicate'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const { $axios } = useNuxtApp() as any
const flash = useFlashStore()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const codePeriod = ref('')
const isDragging = ref(false)
const isPreviewing = ref(false)
const isCommitting = ref(false)
const requestError = ref('')
const preview = ref<PreviewData | null>(null)
const commitResult = ref<CommitData | null>(null)
const issueFilter = ref<IssueFilter>('all')

const numberValue = (value: unknown) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const rowsTotal = computed(() =>
  numberValue(preview.value?.summary.rows_total ?? preview.value?.summary.rows_read),
)

const createCounts = computed<Required<Counts>>(() => ({
  departments: numberValue(
    preview.value?.summary.new_departments ?? preview.value?.summary.create?.departments,
  ),
  sub_departments: numberValue(
    preview.value?.summary.new_sub_departments ?? preview.value?.summary.create?.sub_departments,
  ),
  sub_sub_departments: numberValue(
    preview.value?.summary.new_sub_sub_departments
      ?? preview.value?.summary.create?.sub_sub_departments,
  ),
}))

const existingCounts = computed<Required<Counts>>(() => ({
  departments: numberValue(
    preview.value?.summary.existing_departments ?? preview.value?.summary.existing?.departments,
  ),
  sub_departments: numberValue(
    preview.value?.summary.existing_sub_departments
      ?? preview.value?.summary.existing?.sub_departments,
  ),
  sub_sub_departments: numberValue(
    preview.value?.summary.existing_sub_sub_departments
      ?? preview.value?.summary.existing?.sub_sub_departments,
  ),
}))

const errorIssues = computed(() =>
  (preview.value?.issues ?? []).filter(issue => issue.severity.toLowerCase() === 'error'),
)

const warningIssues = computed(() =>
  (preview.value?.issues ?? []).filter(issue => issue.severity.toLowerCase() === 'warning'),
)

const duplicateIssues = computed(() =>
  (preview.value?.issues ?? []).filter((issue) => {
    const details = String(issue.code ?? '') + ' ' + issue.message
    return /duplicate|existing|ignored|skip|legacy|code/i.test(details)
  }),
)

const visibleIssues = computed(() => {
  const issues = preview.value?.issues ?? []
  if (issueFilter.value === 'all') return issues
  if (issueFilter.value === 'duplicate') return duplicateIssues.value
  return issues.filter(issue => issue.severity.toLowerCase() === issueFilter.value)
})

const hierarchySample = computed(() => (preview.value?.hierarchy ?? []).slice(0, 8))

const canCommit = computed(() => Boolean(
  preview.value?.can_commit
  && preview.value.preview_token
  && errorIssues.value.length === 0
  && !isPreviewing.value
  && !isCommitting.value
  && !commitResult.value,
))

const fileSize = (bytes?: number) => {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const formatDate = (date?: string | null) => {
  if (!date) return ''
  const value = new Date(date)
  return Number.isNaN(value.getTime()) ? date : value.toLocaleString()
}

const errorMessage = (error: any, fallback: string) => {
  const response = error?.response?.data
  if (response?.errors && typeof response.errors === 'object') {
    const first = Object.values(response.errors).flat().find(Boolean)
    if (first) return String(first)
  }
  return response?.message || error?.message || fallback
}

const normaliseIssues = (issues: unknown): ImportIssue[] => {
  if (!Array.isArray(issues)) return []
  return issues.map((issue: any) => ({
    row: issue?.row ?? null,
    severity: String(issue?.severity ?? 'warning'),
    code: issue?.code ? String(issue.code) : null,
    message: String(issue?.message ?? issue ?? 'Import issue'),
    path: issue?.path ? String(issue.path) : null,
  }))
}

const normalisePreview = (payload: any): PreviewData | null => {
  const source = payload?.data ?? payload
  if (!source?.preview_token) return null
  return {
    preview_token: String(source.preview_token),
    code_period: source.code_period || source.summary?.code_period
      ? String(source.code_period ?? source.summary.code_period)
      : undefined,
    expires_at: source.expires_at ?? null,
    file: source.file ?? undefined,
    summary: source.summary ?? {},
    can_commit: Boolean(source.can_commit),
    issues_truncated: Boolean(source.issues_truncated),
    issues: normaliseIssues(source.issues),
    hierarchy: Array.isArray(source.hierarchy) ? source.hierarchy : [],
  }
}

const clearPreview = () => {
  preview.value = null
  commitResult.value = null
  requestError.value = ''
  issueFilter.value = 'all'
}

const resetImport = () => {
  selectedFile.value = null
  clearPreview()
  if (fileInput.value) fileInput.value.value = ''
}

const selectFile = (file?: File | null) => {
  if (!file) return
  if (file.name.split('.').pop()?.toLowerCase() !== 'xlsx') {
    resetImport()
    requestError.value = 'Please select a Microsoft Excel .xlsx file.'
    flash.error(requestError.value)
    return
  }
  if (file.size > MAX_FILE_BYTES) {
    resetImport()
    requestError.value = 'The workbook is larger than the 5 MB upload limit.'
    flash.error(requestError.value)
    return
  }
  selectedFile.value = file
  clearPreview()
}

const handleFileChange = (event: Event) => {
  selectFile((event.target as HTMLInputElement).files?.[0])
}

const handleDrop = (event: DragEvent) => {
  isDragging.value = false
  selectFile(event.dataTransfer?.files?.[0])
}

const previewWorkbook = async () => {
  if (!selectedFile.value) {
    requestError.value = 'Select an .xlsx workbook before creating a preview.'
    return
  }
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(codePeriod.value)) {
    requestError.value = 'Choose a hierarchy code period between January 2000 and December 2099.'
    return
  }

  isPreviewing.value = true
  clearPreview()
  const formData = new FormData()
  formData.append('file', selectedFile.value)
  formData.append('code_period', codePeriod.value)

  try {
    const response = await $axios.post('/api/product-hierarchy-import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const parsed = normalisePreview(response.data)
    if (!parsed) throw new Error('The server returned an incomplete preview response.')
    preview.value = parsed
    if (parsed.can_commit) {
      flash.success('Workbook preview is ready. Review it before importing.')
    } else {
      requestError.value = 'This workbook has validation errors. Nothing has been imported.'
      flash.warning(requestError.value)
    }
  } catch (error: any) {
    const parsed = normalisePreview(error?.response?.data)
    if (parsed) preview.value = parsed
    requestError.value = errorMessage(error, 'The workbook could not be previewed.')
    flash.error(requestError.value)
  } finally {
    isPreviewing.value = false
  }
}

const commitImport = async () => {
  if (!canCommit.value || !preview.value) return
  const totalNew = createCounts.value.departments
    + createCounts.value.sub_departments
    + createCounts.value.sub_sub_departments
  const confirmed = await flash.confirm({
    title: 'Import product hierarchy?',
    message: 'This will create ' + totalNew.toLocaleString()
      + ' new hierarchy records using code period ' + (preview.value.code_period || codePeriod.value)
      + '. Existing records will be kept and nothing will be deleted.',
    confirmText: 'Yes, import',
    cancelText: 'Review again',
  })
  if (!confirmed) return

  isCommitting.value = true
  requestError.value = ''
  try {
    const response = await $axios.post('/api/product-hierarchy-import/commit', {
      preview_token: preview.value.preview_token,
    })
    commitResult.value = response.data?.data ?? response.data
    flash.success(response.data?.message || 'Product hierarchy imported successfully.')
  } catch (error: any) {
    requestError.value = errorMessage(error, 'The hierarchy could not be imported.')
    flash.error(requestError.value)
  } finally {
    isCommitting.value = false
  }
}

const statusClass = (status?: string) => {
  const value = String(status ?? '').toLowerCase()
  if (/new|create/.test(value)) return 'status-new'
  if (/exist|skip/.test(value)) return 'status-existing'
  return 'status-neutral'
}
</script>

<template>
  <div class="dashboard-main-body hierarchy-import-page">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <div>
        <h6 class="fw-semibold mb-4" style="color: #2563eb">Import product hierarchy</h6>
        <p class="text-secondary-light text-sm mb-0">
          Preview departments, sub-departments and sub-sub-departments before saving anything.
        </p>
      </div>
      <ul class="d-flex align-items-center gap-2 mb-0">
        <li class="fw-medium">
          <NuxtLink to="/admin/categories" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:folder-with-files-outline" class="icon text-lg"></iconify-icon>
            Categories
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">Import</li>
      </ul>
    </div>

    <div v-if="commitResult" class="card radius-12 border import-success-card mb-24" aria-live="polite">
      <div class="card-body p-24 p-lg-32">
        <div class="d-flex flex-column flex-md-row align-items-md-start justify-content-between gap-3">
          <div class="d-flex align-items-start gap-3">
            <span class="success-icon">
              <iconify-icon icon="solar:check-circle-bold" class="text-2xl"></iconify-icon>
            </span>
            <div>
              <h5 class="fw-semibold mb-6">Hierarchy imported successfully</h5>
              <p class="text-secondary-light mb-0">
                The validated hierarchy was saved. Existing records were left unchanged.
              </p>
            </div>
          </div>
          <button type="button" class="btn btn-outline-primary" @click="resetImport">
            Import another workbook
          </button>
        </div>
        <div class="row g-3 mt-12">
          <div class="col-6 col-xl-3">
            <div class="result-stat"><span>Departments created</span><strong>{{ numberValue(commitResult.created?.departments).toLocaleString() }}</strong></div>
          </div>
          <div class="col-6 col-xl-3">
            <div class="result-stat"><span>Sub-departments created</span><strong>{{ numberValue(commitResult.created?.sub_departments).toLocaleString() }}</strong></div>
          </div>
          <div class="col-6 col-xl-3">
            <div class="result-stat"><span>Sub-sub-departments created</span><strong>{{ numberValue(commitResult.created?.sub_sub_departments).toLocaleString() }}</strong></div>
          </div>
          <div class="col-6 col-xl-3">
            <div class="result-stat">
              <span>Existing records skipped</span>
              <strong>{{ (
                numberValue(commitResult.skipped?.departments)
                + numberValue(commitResult.skipped?.sub_departments)
                + numberValue(commitResult.skipped?.sub_sub_departments)
              ).toLocaleString() }}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="card radius-12 border-0 shadow-sm mb-24 overflow-hidden">
      <div class="card-header bg-base border-bottom py-20 px-24">
        <div class="d-flex align-items-start gap-3">
          <span class="step-number">1</span>
          <div>
            <h6 class="fw-semibold mb-4">Choose the hierarchy workbook</h6>
            <p class="text-secondary-light text-sm mb-0">
              Only modern Excel <code>.xlsx</code> files are accepted. Maximum file size: 5 MB.
            </p>
          </div>
        </div>
      </div>
      <div class="card-body p-24 p-lg-32">
        <input
          ref="fileInput"
          type="file"
          class="visually-hidden"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          @change="handleFileChange"
        >

        <div class="code-period-panel mb-20">
          <div class="d-flex align-items-start gap-3">
            <span class="period-icon" aria-hidden="true">
              <iconify-icon icon="solar:calendar-date-outline" class="text-xl"></iconify-icon>
            </span>
            <div class="flex-grow-1">
              <label for="hierarchy-code-period" class="form-label fw-semibold mb-6">
                Hierarchy code period
              </label>
              <input
                id="hierarchy-code-period"
                v-model="codePeriod"
                type="month"
                class="form-control code-period-input"
                min="2000-01"
                max="2099-12"
                required
                :disabled="isPreviewing"
                @change="clearPreview"
              >
              <p class="text-secondary-light text-sm mt-8 mb-0">
                This fixed period becomes <code>YYYY_MON</code> in every generated department code
                and is locked into the preview. For example, July 2025 produces
                <code>DEPT_2025_JUL_MAIN_000001</code>.
              </p>
            </div>
          </div>
        </div>

        <div
          class="excel-dropzone"
          :class="{ 'is-dragging': isDragging, 'has-file': selectedFile }"
          role="button"
          tabindex="0"
          @click="fileInput?.click()"
          @keydown.enter.prevent="fileInput?.click()"
          @keydown.space.prevent="fileInput?.click()"
          @dragenter.prevent="isDragging = true"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
        >
          <span class="file-icon">
            <iconify-icon
              :icon="selectedFile ? 'solar:file-check-outline' : 'solar:cloud-upload-outline'"
              class="text-3xl"
            ></iconify-icon>
          </span>
          <template v-if="selectedFile">
            <div class="min-w-0 text-center text-md-start">
              <h6 class="fw-semibold text-break mb-4">{{ selectedFile.name }}</h6>
              <p class="text-secondary-light text-sm mb-0">
                {{ fileSize(selectedFile.size) }} · Ready for server-side validation
              </p>
            </div>
            <button
              type="button"
              class="btn btn-sm btn-outline-danger ms-md-auto"
              aria-label="Remove selected workbook"
              @click.stop="resetImport"
            >
              Remove
            </button>
          </template>
          <template v-else>
            <div class="text-center text-md-start">
              <h6 class="fw-semibold mb-4">Drop your Excel workbook here</h6>
              <p class="text-secondary-light text-sm mb-0">
                or <span class="text-primary-600 fw-semibold">browse from your computer</span>
              </p>
            </div>
          </template>
        </div>

        <div v-if="requestError && !preview" class="alert alert-danger d-flex align-items-start gap-2 mt-20 mb-0" role="alert">
          <iconify-icon icon="solar:danger-triangle-outline" class="text-xl flex-shrink-0 mt-1"></iconify-icon>
          <span>{{ requestError }}</span>
        </div>

        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-24">
          <p class="text-secondary-light text-sm mb-0">Previewing never changes category records.</p>
          <button
            type="button"
            class="btn btn-primary d-inline-flex align-items-center gap-2 px-24"
            :disabled="!selectedFile || !codePeriod || isPreviewing"
            @click="previewWorkbook"
          >
            <span v-if="isPreviewing" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
            <iconify-icon v-else icon="solar:eye-scan-outline" class="text-lg"></iconify-icon>
            {{ isPreviewing ? 'Validating workbook…' : 'Preview import' }}
          </button>
        </div>
      </div>
    </div>

    <template v-if="preview && !commitResult">
      <div class="card radius-12 border-0 shadow-sm mb-24 overflow-hidden">
        <div class="card-header bg-base border-bottom py-20 px-24">
          <div class="d-flex flex-column flex-md-row align-items-md-start justify-content-between gap-3">
            <div class="d-flex align-items-start gap-3">
              <span class="step-number">2</span>
              <div>
                <h6 class="fw-semibold mb-4">Review the validation preview</h6>
                <p class="text-secondary-light text-sm mb-0">
                  {{ preview.file?.name || selectedFile?.name }}
                  <template v-if="preview.file?.sheet"> · Sheet: {{ preview.file.sheet }}</template>
                  <template v-if="preview.code_period"> · Code period: {{ preview.code_period }}</template>
                  <template v-if="preview.expires_at"> · Expires {{ formatDate(preview.expires_at) }}</template>
                </p>
              </div>
            </div>
            <span
              class="preview-state"
              :class="preview.can_commit && !errorIssues.length ? 'is-valid' : 'is-invalid'"
            >
              <iconify-icon
                :icon="preview.can_commit && !errorIssues.length ? 'solar:verified-check-outline' : 'solar:danger-triangle-outline'"
              ></iconify-icon>
              {{ preview.can_commit && !errorIssues.length ? 'Ready to import' : 'Action required' }}
            </span>
          </div>
        </div>

        <div class="card-body p-24 p-lg-32">
          <div class="row g-3">
            <div class="col-6 col-xl-3">
              <div class="metric-card h-100"><span class="metric-icon"><iconify-icon icon="solar:document-text-outline"></iconify-icon></span><span>Workbook rows</span><strong>{{ rowsTotal.toLocaleString() }}</strong></div>
            </div>
            <div class="col-6 col-xl-3">
              <div class="metric-card h-100"><span class="metric-icon"><iconify-icon icon="solar:folder-outline"></iconify-icon></span><span>Departments</span><strong>{{ numberValue(preview.summary.departments).toLocaleString() }}</strong></div>
            </div>
            <div class="col-6 col-xl-3">
              <div class="metric-card h-100"><span class="metric-icon"><iconify-icon icon="solar:folder-with-files-outline"></iconify-icon></span><span>Sub-departments</span><strong>{{ numberValue(preview.summary.sub_departments).toLocaleString() }}</strong></div>
            </div>
            <div class="col-6 col-xl-3">
              <div class="metric-card h-100"><span class="metric-icon"><iconify-icon icon="solar:layers-outline"></iconify-icon></span><span>Sub-sub-departments</span><strong>{{ numberValue(preview.summary.sub_sub_departments).toLocaleString() }}</strong></div>
            </div>
          </div>

          <div class="row g-3 mt-4">
            <div class="col-xl-8">
              <div class="plan-panel h-100">
                <div class="d-flex align-items-center justify-content-between gap-2 mb-16">
                  <h6 class="text-md fw-semibold mb-0">Database plan</h6>
                  <span class="text-secondary-light text-sm">Create missing · keep existing</span>
                </div>
                <div class="table-responsive">
                  <table class="table align-middle mb-0 import-plan-table">
                    <thead><tr><th>Hierarchy level</th><th class="text-end">New</th><th class="text-end">Existing</th></tr></thead>
                    <tbody>
                      <tr><td>Departments</td><td class="text-end fw-semibold text-success">{{ createCounts.departments.toLocaleString() }}</td><td class="text-end">{{ existingCounts.departments.toLocaleString() }}</td></tr>
                      <tr><td>Sub-departments</td><td class="text-end fw-semibold text-success">{{ createCounts.sub_departments.toLocaleString() }}</td><td class="text-end">{{ existingCounts.sub_departments.toLocaleString() }}</td></tr>
                      <tr><td>Sub-sub-departments</td><td class="text-end fw-semibold text-success">{{ createCounts.sub_sub_departments.toLocaleString() }}</td><td class="text-end">{{ existingCounts.sub_sub_departments.toLocaleString() }}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div class="col-xl-4">
              <div class="plan-panel h-100">
                <h6 class="text-md fw-semibold mb-16">Validation</h6>
                <div class="validation-row"><span><i class="validation-dot error"></i>Errors</span><strong>{{ numberValue(preview.summary.error_count ?? errorIssues.length).toLocaleString() }}</strong></div>
                <div class="validation-row"><span><i class="validation-dot warning"></i>Warnings</span><strong>{{ numberValue(preview.summary.warning_count ?? warningIssues.length).toLocaleString() }}</strong></div>
                <div class="validation-row"><span><i class="validation-dot duplicate"></i>Duplicate paths</span><strong>{{ numberValue(preview.summary.duplicate_paths).toLocaleString() }}</strong></div>
                <div class="validation-row border-0 pb-0"><span><i class="validation-dot ignored"></i>Ignored rows</span><strong>{{ numberValue(preview.summary.ignored_rows ?? preview.summary.separator_rows).toLocaleString() }}</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="preview.issues.length" class="card radius-12 border-0 shadow-sm mb-24 overflow-hidden">
        <div class="card-header bg-base border-bottom py-20 px-24">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <h6 class="fw-semibold mb-4">Validation details</h6>
              <p class="text-secondary-light text-sm mb-0">Use row numbers to correct source data before previewing again.</p>
            </div>
            <div class="issue-filters" role="group" aria-label="Filter validation issues">
              <button type="button" :class="{ active: issueFilter === 'all' }" @click="issueFilter = 'all'">All <span>{{ preview.issues.length }}</span></button>
              <button type="button" :class="{ active: issueFilter === 'error' }" @click="issueFilter = 'error'">Errors <span>{{ errorIssues.length }}</span></button>
              <button type="button" :class="{ active: issueFilter === 'warning' }" @click="issueFilter = 'warning'">Warnings <span>{{ warningIssues.length }}</span></button>
              <button type="button" :class="{ active: issueFilter === 'duplicate' }" @click="issueFilter = 'duplicate'">Duplicates / skipped <span>{{ duplicateIssues.length }}</span></button>
            </div>
          </div>
        </div>
        <div v-if="preview.issues_truncated" class="alert alert-warning rounded-0 border-start-0 border-end-0 mb-0" role="status">
          The workbook has more than 500 validation findings. The totals above include every finding,
          while this table shows the first 500. Correct those rows and preview the workbook again to
          reveal any remaining findings.
        </div>
        <div class="table-responsive">
          <table class="table bordered-table mb-0 issue-table">
            <thead><tr><th class="issue-row-column">Row</th><th>Type</th><th>Code</th><th>Details</th></tr></thead>
            <tbody>
              <tr v-for="(issue, index) in visibleIssues" :key="String(issue.row) + '-' + String(issue.code) + '-' + index">
                <td>{{ issue.row ?? '—' }}</td>
                <td><span class="issue-severity" :class="'is-' + issue.severity.toLowerCase()">{{ issue.severity }}</span></td>
                <td><code>{{ issue.code || 'VALIDATION' }}</code></td>
                <td><span class="d-block">{{ issue.message }}</span><small v-if="issue.path" class="text-secondary-light">{{ issue.path }}</small></td>
              </tr>
              <tr v-if="!visibleIssues.length"><td colspan="4" class="text-center text-secondary-light py-24">No issues in this filter.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card radius-12 border-0 shadow-sm mb-24 overflow-hidden">
        <div class="card-header bg-base border-bottom py-20 px-24">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <h6 class="fw-semibold mb-4">Hierarchy sample</h6>
              <p class="text-secondary-light text-sm mb-0">A compact sample of how the workbook maps to the database.</p>
            </div>
            <span class="text-secondary-light text-sm">Showing {{ hierarchySample.length }} of {{ preview.hierarchy.length }} departments</span>
          </div>
        </div>
        <div class="card-body p-24">
          <div v-if="hierarchySample.length" class="hierarchy-grid">
            <article
              v-for="department in hierarchySample"
              :key="department.external_id || department.main_id || department.name"
              class="hierarchy-department"
            >
              <div class="d-flex align-items-start justify-content-between gap-2 mb-12">
                <div class="d-flex align-items-start gap-2 min-w-0">
                  <iconify-icon icon="solar:folder-bold" class="text-primary-600 text-xl mt-1 flex-shrink-0"></iconify-icon>
                  <div class="min-w-0">
                    <h6 class="text-md fw-semibold text-break mb-2">{{ department.name }}</h6>
                    <small class="text-secondary-light">{{ department.external_id || department.main_id }}</small>
                    <code v-if="department.code" class="hierarchy-code d-block mt-4">{{ department.code }}</code>
                    <small
                      v-if="department.canonical_code && department.canonical_code !== department.code"
                      class="canonical-code d-block mt-3"
                    >Canonical namespace: <code>{{ department.canonical_code }}</code></small>
                  </div>
                </div>
                <span class="tree-status" :class="statusClass(department.status)">{{ department.status || 'preview' }}</span>
              </div>
              <ul class="hierarchy-list mb-0">
                <li v-for="subDepartment in (department.sub_departments ?? []).slice(0, 5)" :key="subDepartment.name">
                  <div class="hierarchy-sub-row">
                    <span class="text-break">
                      {{ subDepartment.name }}
                      <code v-if="subDepartment.code" class="hierarchy-code d-block mt-3">{{ subDepartment.code }}</code>
                      <small
                        v-if="subDepartment.canonical_code && subDepartment.canonical_code !== subDepartment.code"
                        class="canonical-code d-block mt-2"
                      >Canonical: <code>{{ subDepartment.canonical_code }}</code></small>
                    </span>
                    <span class="tree-status" :class="statusClass(subDepartment.status)">{{ subDepartment.status || 'preview' }}</span>
                  </div>
                  <ul v-if="subDepartment.sub_sub_departments?.length" class="hierarchy-leaves">
                    <li v-for="leaf in subDepartment.sub_sub_departments.slice(0, 6)" :key="leaf.name">
                      <span class="text-break">
                        {{ leaf.name }}
                        <code v-if="leaf.code" class="hierarchy-code d-block mt-3">{{ leaf.code }}</code>
                        <small
                          v-if="leaf.canonical_code && leaf.canonical_code !== leaf.code"
                          class="canonical-code d-block mt-2"
                        >Canonical: <code>{{ leaf.canonical_code }}</code></small>
                      </span>
                      <span class="tree-status" :class="statusClass(leaf.status)">{{ leaf.status || 'preview' }}</span>
                    </li>
                    <li v-if="subDepartment.sub_sub_departments.length > 6" class="more-row">
                      +{{ subDepartment.sub_sub_departments.length - 6 }} more sub-sub-departments
                    </li>
                  </ul>
                </li>
                <li v-if="(department.sub_departments?.length ?? 0) > 5" class="more-row">
                  +{{ (department.sub_departments?.length ?? 0) - 5 }} more sub-departments
                </li>
              </ul>
            </article>
          </div>
          <div v-else class="text-center text-secondary-light py-24">No valid hierarchy records were available for the sample.</div>
        </div>
      </div>

      <div class="card radius-12 border commit-card overflow-hidden">
        <div class="card-body p-24 p-lg-32">
          <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-4">
            <div class="d-flex align-items-start gap-3">
              <span class="step-number">3</span>
              <div>
                <h6 class="fw-semibold mb-4">Confirm and save</h6>
                <p v-if="canCommit" class="text-secondary-light text-sm mb-0">
                  The import is transactional. If saving fails, no partial hierarchy will remain.
                </p>
                <p v-else class="text-danger-600 text-sm mb-0">
                  Resolve all validation errors and create a new preview before importing.
                </p>
              </div>
            </div>
            <div class="d-flex flex-wrap align-items-center gap-2 justify-content-lg-end">
              <button type="button" class="btn btn-outline-secondary" :disabled="isCommitting" @click="resetImport">Choose another file</button>
              <button type="button" class="btn btn-success d-inline-flex align-items-center gap-2 px-24" :disabled="!canCommit" @click="commitImport">
                <span v-if="isCommitting" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                <iconify-icon v-else icon="solar:database-outline" class="text-lg"></iconify-icon>
                {{ isCommitting ? 'Importing…' : 'Import hierarchy' }}
              </button>
            </div>
          </div>
          <div v-if="requestError" class="alert alert-danger d-flex align-items-start gap-2 mt-20 mb-0" role="alert">
            <iconify-icon icon="solar:danger-triangle-outline" class="text-xl flex-shrink-0 mt-1"></iconify-icon>
            <span>{{ requestError }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.hierarchy-import-page {
  --import-accent: #2563eb;
  --import-accent-soft: #eff6ff;
  --import-border: #e5e7eb;
  --import-muted: #64748b;
}

.min-w-0 { min-width: 0; }

.step-number,
.file-icon,
.period-icon,
.success-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--import-accent-soft);
  color: var(--import-accent);
  font-size: 14px;
  font-weight: 700;
}

.code-period-panel {
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  background: #eff6ff;
  padding: 18px;
}

.period-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  color: var(--import-accent);
  background: #dbeafe;
}

.code-period-input { max-width: 220px; }

.hierarchy-code {
  color: #334155;
  font-size: 10px;
  overflow-wrap: anywhere;
  white-space: normal;
}

.canonical-code {
  color: #b45309;
  line-height: 1.35;
}

.canonical-code code {
  color: inherit;
  font-size: 10px;
  overflow-wrap: anywhere;
}

.excel-dropzone {
  min-height: 150px;
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  background: #f8fafc;
  padding: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  cursor: pointer;
  transition: border-color 160ms ease, background-color 160ms ease, transform 160ms ease;
}

.excel-dropzone:hover,
.excel-dropzone:focus-visible,
.excel-dropzone.is-dragging {
  border-color: var(--import-accent);
  background: var(--import-accent-soft);
  outline: none;
}

.excel-dropzone.is-dragging { transform: translateY(-2px); }
.excel-dropzone.has-file { justify-content: flex-start; border-style: solid; }

.file-icon {
  width: 58px;
  height: 58px;
  border-radius: 14px;
  color: var(--import-accent);
  background: #dbeafe;
}

.preview-state,
.tree-status,
.issue-severity {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  text-transform: capitalize;
  white-space: nowrap;
}

.preview-state { padding: 8px 12px; }

.preview-state.is-valid,
.status-new,
.issue-severity.is-info {
  color: #047857;
  background: #d1fae5;
}

.preview-state.is-invalid,
.issue-severity.is-error {
  color: #b91c1c;
  background: #fee2e2;
}

.metric-card {
  border: 1px solid var(--import-border);
  border-radius: 10px;
  padding: 18px;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  column-gap: 10px;
}

.metric-card > span:not(.metric-icon) {
  color: var(--import-muted);
  font-size: 12px;
}

.metric-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--import-accent);
  background: var(--import-accent-soft);
  grid-row: span 2;
  font-size: 20px;
}

.metric-card strong { font-size: 22px; line-height: 1.25; }

.plan-panel {
  border: 1px solid var(--import-border);
  border-radius: 10px;
  padding: 20px;
}

.import-plan-table th {
  color: var(--import-muted);
  font-size: 12px;
  font-weight: 600;
}

.validation-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--import-border);
  font-size: 13px;
}

.validation-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 8px;
}

.validation-dot.error { background: #ef4444; }
.validation-dot.warning { background: #f59e0b; }
.validation-dot.duplicate { background: #8b5cf6; }
.validation-dot.ignored { background: #94a3b8; }

.issue-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.issue-filters button {
  border: 1px solid var(--import-border);
  background: transparent;
  color: var(--import-muted);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
}

.issue-filters button span { margin-left: 4px; }

.issue-filters button:hover,
.issue-filters button.active {
  border-color: var(--import-accent);
  color: var(--import-accent);
  background: var(--import-accent-soft);
}

.issue-row-column { width: 76px; }
.issue-table td { vertical-align: top; }
.issue-severity { padding: 6px 9px; }

.issue-severity.is-warning {
  color: #b45309;
  background: #fef3c7;
}

.hierarchy-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.hierarchy-department {
  border: 1px solid var(--import-border);
  border-radius: 10px;
  padding: 18px;
}

.hierarchy-list,
.hierarchy-leaves {
  list-style: none;
  padding: 0;
}

.hierarchy-list > li {
  border-top: 1px solid #f1f5f9;
  padding: 10px 0 0 22px;
  margin-top: 10px;
  position: relative;
}

.hierarchy-list > li::before {
  content: '';
  position: absolute;
  left: 3px;
  top: 17px;
  width: 10px;
  height: 7px;
  border-left: 1px solid #94a3b8;
  border-bottom: 1px solid #94a3b8;
}

.hierarchy-sub-row,
.hierarchy-leaves li {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
}

.hierarchy-sub-row { font-weight: 600; }
.hierarchy-leaves { padding: 8px 0 0 16px; }

.hierarchy-leaves li {
  color: var(--import-muted);
  padding: 5px 0;
}

.tree-status { padding: 4px 7px; font-size: 10px; }
.status-existing { color: #475569; background: #e2e8f0; }
.status-neutral { color: #1d4ed8; background: #dbeafe; }

.more-row {
  color: var(--import-accent) !important;
  font-weight: 600;
  font-size: 12px !important;
}

.commit-card {
  border-color: #bfdbfe !important;
  background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
}

.import-success-card {
  border-color: #a7f3d0 !important;
  background: linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%);
}

.success-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  color: #047857;
  background: #d1fae5;
}

.result-stat {
  height: 100%;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #d1fae5;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-stat span { color: var(--import-muted); font-size: 12px; }
.result-stat strong { color: #047857; font-size: 20px; }

@media (max-width: 991.98px) {
  .hierarchy-grid { grid-template-columns: 1fr; }
}

@media (max-width: 767.98px) {
  .excel-dropzone {
    flex-direction: column;
    padding: 24px 18px;
  }

  .metric-card { padding: 14px; }
  .metric-card strong { font-size: 18px; }
  .issue-filters { width: 100%; }
  .issue-filters button { flex: 1 1 auto; }
}
</style>
