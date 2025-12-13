// stores/flash.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type FlashType = 'success' | 'error' | 'warning' | 'info'

interface FlashToast {
  id: number
  type: FlashType
  title?: string
  message: string
  timeout: number
}

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
}

interface ConfirmState extends ConfirmOptions {
  visible: boolean
  resolve?: (value: boolean) => void
}

let idCounter = 1

export const useFlashStore = defineStore('flash', () => {
  const toasts = ref<FlashToast[]>([])
  const confirmState = ref<ConfirmState | null>(null)

  const removeToast = (id: number) => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  const push = (type: FlashType, message: string, title?: string, timeout = 3000) => {
    const id = idCounter++
    const toast: FlashToast = { id, type, message, title, timeout }
    toasts.value.push(toast)

    // auto-dismiss
    setTimeout(() => removeToast(id), timeout)
  }

  const success = (message: string, title = 'Success') => push('success', message, title)
  const error = (message: string, title = 'Error') => push('error', message, title, 5000)
  const warning = (message: string, title = 'Warning') => push('warning', message, title, 4000)
  const info = (message: string, title = 'Info') => push('info', message, title)

  // 🔸 Confirmation dialog (returns a Promise<boolean>)
  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      confirmState.value = {
        visible: true,
        title: options.title ?? 'Are you sure?',
        message: options.message,
        confirmText: options.confirmText ?? 'Yes',
        cancelText: options.cancelText ?? 'Cancel',
        resolve,
      }
    })
  }

  const resolveConfirm = (answer: boolean) => {
    if (confirmState.value?.resolve) {
      confirmState.value.resolve(answer)
    }
    confirmState.value = null
  }

  return {
    // state
    toasts,
    confirmState,
    // toast methods
    push,
    success,
    error,
    warning,
    info,
    removeToast,
    // confirm methods
    confirm,
    resolveConfirm,
  }
})
