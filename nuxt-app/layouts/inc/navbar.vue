<script setup lang="ts">
import { useNuxtApp, navigateTo, definePageMeta, useHead } from '#imports'
import { useAdminUI } from '~/composables/useAdminUI'
import { useBootstrapUI } from '~/composables/useBootstrapUI'
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
useAdminUI()
useBootstrapUI()

const { $axios } = (useNuxtApp() as any);
const nuxtApp = useNuxtApp()

let channel: any = null

interface ConxNotification {
    id: number
    title: string
    message: string | null
    order_id?: number | null
    url?: string | null
    read_at: string | null
    created_at: string | null
}

// ---- state ----
const notifications = ref<ConxNotification[]>([])
const unreadCount = computed(
    () => notifications.value.filter(n => !n.read_at).length
)

const baseTitle = 'ISC Admin'
useHead(() => ({
    title: unreadCount.value > 0
        ? `(${unreadCount.value}) ${baseTitle}`
        : baseTitle,
}))

// ---- helpers ----
const formatTimeAgo = (iso: string | null) => {
    if (!iso) return ''
    const date = new Date(iso)
    const diffMs = Date.now() - date.getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins} mins ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} hrs ago`
    const days = Math.floor(hours / 24)
    return `${days} days ago`
}

const fetchNotifications = async () => {
    try {
        const res = await $axios.get('/api/notifications')
        notifications.value = res.data.data
    } catch (e) {
        console.error('Failed to fetch notifications', e)
    }
}

const markAllAsRead = async () => {
    try {
        if (!unreadCount.value) return
        await $axios.post('/api/notifications/mark-as-read')
        const now = new Date().toISOString()
        notifications.value = notifications.value.map(n => ({
            ...n,
            read_at: n.read_at ?? now,
        }))
    } catch (e) {
        console.error('Failed to mark notifications as read', e)
    }
}

// when user clicks the bell (dropdown button)
const handleBellClick = async () => {
    await markAllAsRead()
}

onMounted(async () => {
    await fetchNotifications()

    const pusher = nuxtApp.$pusher

    pusher.connection.bind('error', (err: any) => {
        console.error('Pusher connection error:', err)
    })

    channel = pusher.subscribe('orders')

    channel.bind('order.placed', async (data: any) => {
        console.log('🎉 order.placed from Laravel:', data)
        // easiest: re-fetch from DB so UI is always consistent
        await fetchNotifications()
    })
})


onBeforeUnmount(() => {
    if (channel) {
        channel.unbind('order.placed')
    }
    const pusher = nuxtApp.$pusher
    pusher.unsubscribe('orders')
})

const logout = async () => {

    try {
        await $axios.post('/api/logout')
        localStorage.removeItem('token')
        await navigateTo('/');
    } catch (err) {
        console.error('Logout failed', err)
    }
}
</script>
<template>
    <div class="navbar-header">


        <div class="row align-items-center justify-content-between">


            <div class="col-auto">
                <div class="d-flex flex-wrap align-items-center gap-4">


                    <button type="button" class="sidebar-mobile-toggle">
                        <iconify-icon icon="heroicons:bars-3-solid" class="icon"></iconify-icon>
                    </button>
                    <form class="navbar-search">
                        <input type="text" name="search" placeholder="Search">
                        <iconify-icon icon="ion:search-outline" class="icon"></iconify-icon>
                    </form>
                </div>
            </div>
            <div class="col-auto">
                <div class="d-flex flex-wrap align-items-center gap-3">





                    <div class="dropdown">
                        <button
                            class="has-indicator w-40-px h-40-px bg-neutral-200 rounded-circle d-flex justify-content-center align-items-center position-relative"
                            type="button" data-bs-toggle="dropdown" @click="handleBellClick">
                            <iconify-icon icon="iconoir:bell" class="text-primary-light text-xl"></iconify-icon>

                            <!-- Small red dot if there are unread notifications -->
                            <span v-if="unreadCount" class="position-absolute top-0 end-0 translate-middle
             bg-danger text-white rounded-circle"
                                style="min-width: 18px; min-height: 18px; font-size: 11px; display:flex; align-items:center; justify-content:center;">
                                {{ unreadCount }}
                            </span>
                        </button>

                        <div class="dropdown-menu to-top dropdown-menu-lg p-0">
                            <div
                                class="m-16 py-12 px-16 radius-8 bg-primary-50 mb-16 d-flex align-items-center justify-content-between gap-2">
                                <div>
                                    <h6 class="text-lg text-primary-light fw-semibold mb-0">
                                        Notifications
                                    </h6>
                                </div>
                                <span
                                    class="text-primary-600 fw-semibold text-lg w-40-px h-40-px rounded-circle bg-base d-flex justify-content-center align-items-center">
                                    {{ unreadCount }}
                                </span>
                            </div>

                            <div class="max-h-400-px overflow-y-auto scroll-sm pe-4">
                                <a v-for="n in notifications" :key="n.id" href="javascript:void(0)"
                                    class="px-24 py-12 d-flex align-items-start gap-3 mb-2 justify-content-between">
                                    <div
                                        class="text-black hover-bg-transparent hover-text-primary d-flex align-items-center gap-3">
                                        <span
                                            class="w-44-px h-44-px bg-success-subtle text-success-main rounded-circle d-flex justify-content-center align-items-center flex-shrink-0">
                                            <iconify-icon icon="bitcoin-icons:verify-outline"
                                                class="icon text-xxl"></iconify-icon>
                                        </span>
                                        <div>
                                            <h6 class="text-md fw-semibold mb-4">
                                                {{ n.title }}
                                            </h6>
                                            <p class="mb-0 text-sm text-secondary-light text-w-200-px">
                                                {{ n.message }}
                                            </p>
                                        </div>
                                    </div>
                                    <span class="text-sm text-secondary-light flex-shrink-0">
                                        {{ formatTimeAgo(n.created_at) }}
                                    </span>
                                </a>

                                <p v-if="!notifications.length" class="text-center text-sm text-secondary-light py-3">
                                    No notifications
                                </p>
                            </div>

                            <div class="text-center py-12 px-16">
                                <a href="javascript:void(0)" class="text-primary-600 fw-semibold text-md">
                                    See All Notification
                                </a>
                            </div>
                        </div>
                    </div>


                    <div class="dropdown">
                        <button class="d-flex justify-content-center align-items-center rounded-circle" type="button"
                            data-bs-toggle="dropdown">
                            <img src="https://avinaq.com/logonew1.jpg" alt="image"
                                class="w-40-px h-40-px object-fit-cover rounded-circle">
                        </button>
                        <div class="dropdown-menu to-top dropdown-menu-sm">
                            <div
                                class="py-12 px-16 radius-8 bg-primary-50 mb-16 d-flex align-items-center justify-content-between gap-2">
                                <div>
                                    <h6 class="text-lg text-primary-light fw-semibold mb-2">Shaidul Islam</h6>
                                    <span class="text-secondary-light fw-medium text-sm">Admin</span>
                                </div>
                                <button type="button" class="hover-text-danger">
                                    <iconify-icon icon="radix-icons:cross-1" class="icon text-xl"></iconify-icon>
                                </button>
                            </div>
                            <ul class="to-top-list">

                                <li>
                                    <a class="dropdown-item text-black px-0 py-8 hover-bg-transparent hover-text-primary d-flex align-items-center gap-3"
                                        @click.prevent="logout()">
                                        <iconify-icon icon="lucide:power" class="icon text-xl"></iconify-icon> Log Out
                                    </a>
                                </li>

                            </ul>
                        </div>
                    </div><!-- Profile dropdown end -->
                </div>



            </div>
        </div>
    </div>



</template>