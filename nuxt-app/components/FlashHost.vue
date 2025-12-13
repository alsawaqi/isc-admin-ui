<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useFlashStore } from '~/stores/flashs'

const flash = useFlashStore()
const { toasts, confirmState } = storeToRefs(flash)

const handleConfirm = (answer: boolean) => {
  flash.resolveConfirm(answer)
}
</script>

<template>
  <!-- Toasts container -->
  <div class="flash-container">
    <TransitionGroup name="flash-slide">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="flash-toast shadow-lg"
        :class="`flash-${toast.type}`"
      >
        <div class="flash-accent"></div>

        <div class="flash-content">
          <div class="flash-title-row">
            <span class="flash-icon">
              <iconify-icon
                v-if="toast.type === 'success'"
                icon="solar:check-circle-broken"
              />
              <iconify-icon
                v-else-if="toast.type === 'error'"
                icon="solar:danger-triangle-broken"
              />
              <iconify-icon
                v-else-if="toast.type === 'warning'"
                icon="solar:warning-triangle-broken"
              />
              <iconify-icon
                v-else
                icon="solar:info-circle-broken"
              />
            </span>
            <strong class="flash-title">
              {{ toast.title }}
            </strong>
          </div>
          <p class="flash-message mb-0">
            {{ toast.message }}
          </p>
        </div>

        <button
          type="button"
          class="flash-close btn btn-sm btn-link p-0 text-white-50"
          @click="flash.removeToast(toast.id)"
        >
          ×
        </button>
      </div>
    </TransitionGroup>
  </div>

  <!-- Confirm dialog -->
  <Transition name="flash-fade">
    <div
      v-if="confirmState?.visible"
      class="flash-confirm-backdrop"
    >
      <div class="flash-confirm-card">
        <h6 class="fw-semibold mb-2">
          {{ confirmState.title }}
        </h6>
        <p class="mb-4 text-secondary">
          {{ confirmState.message }}
        </p>

        <div class="d-flex justify-content-end gap-2">
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm px-3"
            @click="handleConfirm(false)"
          >
            {{ confirmState.cancelText }}
          </button>
          <button
            type="button"
            class="btn btn-danger btn-sm px-3"
            @click="handleConfirm(true)"
          >
            {{ confirmState.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Toast container */
.flash-container {
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 2100;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Toast card */
.flash-toast {
  display: flex;
  align-items: stretch;
  min-width: 260px;
  max-width: 360px;
  background: #0f172a;
  color: #e5e7eb;
  border-radius: 0.75rem;
  overflow: hidden;
  padding: 0.75rem 0.75rem 0.75rem 0;
  backdrop-filter: blur(8px);
}

.flash-accent {
  width: 4px;
  border-radius: 999px;
}

/* Type colors */
.flash-success .flash-accent {
  background: #22c55e;
}
.flash-error .flash-accent {
  background: #ef4444;
}
.flash-warning .flash-accent {
  background: #f59e0b;
}
.flash-info .flash-accent {
  background: #3b82f6;
}

.flash-content {
  padding: 0 0.75rem;
  flex: 1;
}

.flash-title-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.15rem;
}

.flash-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.flash-title {
  font-size: 0.875rem;
}

.flash-message {
  font-size: 0.8125rem;
  color: #9ca3af;
}

.flash-close {
  margin-right: 0.35rem;
  font-size: 1rem;
}

/* Slide animation for toasts */
.flash-slide-enter-active,
.flash-slide-leave-active {
  transition: all 0.2s ease-out;
}
.flash-slide-enter-from {
  opacity: 0;
  transform: translateX(16px) translateY(-8px);
}
.flash-slide-leave-to {
  opacity: 0;
  transform: translateX(12px) translateY(8px);
}

/* Confirm dialog */
.flash-confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: grid;
  place-items: center;
  z-index: 2200;
}

.flash-confirm-card {
  width: min(420px, 90vw);
  background: #ffffff;
  border-radius: 0.75rem;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.35);
}

/* Fade animation for confirm dialog */
.flash-fade-enter-active,
.flash-fade-leave-active {
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
}
.flash-fade-enter-from,
.flash-fade-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.98);
}
</style>
