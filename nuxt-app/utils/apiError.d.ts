export interface ApiErrorMessages {
  fallback?: string
  unauthenticated?: string
  forbidden?: string
  payloadTooLarge?: string
  validation?: string
  rateLimited?: string
  server?: string
  network?: string
}

export function apiErrorMessage(error: unknown, options?: ApiErrorMessages): string
