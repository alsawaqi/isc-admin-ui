// plugins/pusher.client.ts
import Pusher from 'pusher-js'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server) return

  const config = useRuntimeConfig()

  // Enable logging - helpful while testing
  Pusher.logToConsole = true

  // You can still hardcode the key if you want,
  // but config.public.pusherKey is cleaner if you set it in nuxt.config.ts
  const pusher = new Pusher('5f0de805484e24aaa216', {
    cluster: 'ap2',
  })

  nuxtApp.provide('pusher', pusher)
})

declare module '#app' {
  interface NuxtApp {
    $pusher: import('pusher-js').default
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $pusher: import('pusher-js').default
  }
}
