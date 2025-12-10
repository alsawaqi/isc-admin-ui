import { defineStore } from 'pinia'

interface FlashState {
  visible: boolean
  title: string | null
  subtitle: string | null
}

export const useFlashStore = defineStore('flash', {
  state: (): FlashState => ({
    visible: false,
    title: null,
    subtitle: null,
  }),

  actions: {
    showWelcome(name: string, redirectTo: string = '/admin', duration: number = 2200) {
      this.title = `Welcome,!`
      this.subtitle = 'Loading your dashboard...'
      this.visible = true

      if (typeof window !== 'undefined') {
        setTimeout(() => {
          this.visible = false
          
          window.location.href = redirectTo
        }, duration)
      }
    },

    hide() {
      this.visible = false
    },
  },
})
