// composables/useImagePreview.ts
import { ref } from 'vue'

export function useImagePreview(initialUrl: string | null = null) {
  const file = ref<File | null>(null)
  const url  = ref<string | null>(initialUrl)

  const setFromFile = (f: File | null) => {
    // cleanup old blob first
    if (url.value && url.value.startsWith('blob:')) URL.revokeObjectURL(url.value)

    file.value = f
    url.value  = f ? URL.createObjectURL(f) : null
  }

  const onFileChange = (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0] ?? null
    setFromFile(f)
  }

  const setFromUrl = (imageUrl: string | null) => {
    // cleanup old blob before switching to a normal URL
    if (url.value && url.value.startsWith('blob:')) URL.revokeObjectURL(url.value)
    file.value = null
    url.value  = imageUrl
  }

  const clear = () => {
    if (url.value && url.value.startsWith('blob:')) URL.revokeObjectURL(url.value)
    file.value = null
    url.value  = null
  }

  return { file, url, onFileChange, setFromFile, setFromUrl, clear }
}
