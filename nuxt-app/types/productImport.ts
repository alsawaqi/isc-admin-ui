export interface ImportIssue { row: number; severity: 'error' | 'warning'; field: string; message: string }
export interface ImportOptions { match_inhouse?: boolean; product_type_id: number | null; price_column: 'min' | 'max'; blank_stock: 'reject' | 'zero'; category_map: Record<string, string>; brand_map: Record<string, string> }
export interface ImportLookup { id: number | string; name: string }
export type ImportAction = 'add' | 'update' | 'restore'
export interface ImportRow { action: ImportAction; target_id: number | string | null; row: number; sku: string; name: string; description: string; barcode: string; stock: number | null; price: string | null; minimum: string | null; cost: string | null; brand: string; valid: boolean; issues: ImportIssue[] }
export interface ImportPreview {
  preview_token: string; expires_at: string; sheet: string; can_commit: boolean;
  summary: { add: number; update: number; restore: number; blocked: number; total: number; valid: number; errors: number; warnings: number; new_brands: number };
  rows: ImportRow[]; issues: ImportIssue[];
  categories: { key: string; source: string; selected_id: string | number | null; options: ImportLookup[] }[];
  brands: { key: string; source: string; selected_id: string | number | null }[];
}
export interface ImportRollback { job_id: number; updates_reversed?: number; products_removed: number; brands_removed: number; brands_retained: number; rolled_back_at: string; idempotent: boolean }
export interface ImportReceipt { job_id: number; created: number; updated?: number; restored?: number; product_ids: number[]; brands_created: number; active: boolean; idempotent: boolean; undo_available?: boolean; rollback?: ImportRollback }
export interface ImportHistory { id: number | string; File_Name: string; Status: 'committed' | 'rolled_back'; Committed_At: string; Result: ImportReceipt }
