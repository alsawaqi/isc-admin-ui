export interface ImportIssue { row: number; severity: 'error' | 'warning'; field: string; message: string }
export interface ImportOptions { product_type_id: number | null; price_column: 'min' | 'max'; blank_stock: 'reject' | 'zero'; category_map: Record<string, string>; brand_map: Record<string, string> }
export interface ImportLookup { id: number | string; name: string }
export interface ImportRow { row: number; sku: string; name: string; description: string; barcode: string; stock: number | null; price: string | null; minimum: string | null; cost: string | null; brand: string; valid: boolean; issues: ImportIssue[] }
export interface ImportPreview {
  preview_token: string; expires_at: string; sheet: string; can_commit: boolean;
  summary: { total: number; valid: number; errors: number; warnings: number; new_brands: number };
  rows: ImportRow[]; issues: ImportIssue[];
  categories: { key: string; source: string; selected_id: string | number | null; options: ImportLookup[] }[];
  brands: { key: string; source: string; selected_id: string | number | null }[];
}
export interface ImportReceipt { job_id: number; created: number; product_ids: number[]; brands_created: number; active: boolean; idempotent: boolean }
