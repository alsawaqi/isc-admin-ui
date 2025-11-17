import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import * as PusherPushNotifications from '@pusher/push-notifications-web'

export default defineNuxtPlugin((nuxtApp) => {
  if (process.server) return

  const config = useRuntimeConfig()

  const beamsClient = new PusherPushNotifications.Client({
    instanceId: 'e1944000-0a47-4005-9ac3-1f0480b9ae16',
  })

  // make it available as nuxtApp.$beams
  nuxtApp.provide('beams', beamsClient)
})
