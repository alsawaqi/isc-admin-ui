import type * as PusherPushNotifications from '@pusher/push-notifications-web'

declare module '#app' {
  interface NuxtApp {
    $beams: PusherPushNotifications.Client
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $beams: PusherPushNotifications.Client
  }
}
