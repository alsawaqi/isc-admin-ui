export function adminStatusLabel(status?: string | null): string
export function adminStatusClass(status?: string | null): string
export function adminActionLabel(action: string, subject?: string | number | null): string
export function tableNavigationLabel(tableName: string, page?: number, lastPage?: number): string
export function isKeyboardActivation(event: { key?: string } | null | undefined): boolean
