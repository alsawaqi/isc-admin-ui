<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, defineExpose } from 'vue'
import SignaturePad from 'signature_pad'

type ImageType = 'image/png' | 'image/jpeg' | 'image/svg+xml'

const props = withDefaults(defineProps<{
  penColor?: string
  backgroundColor?: string
  lineWidth?: number
  height?: number | null
  width?: number | null
  throttle?: number | null // draw throttle ms
}>(), {
  penColor: '#111',
  backgroundColor: '#fff',
  lineWidth: 2,
  height: null,
  width: null,
  throttle: 0,
})

const emit = defineEmits<{
  (e: 'change', isEmpty: boolean): void
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
let pad: SignaturePad | null = null
let resizeObserver: ResizeObserver | null = null

const resizeCanvas = () => {
  if (!canvas.value) return
  const c = canvas.value
  const parent = c.parentElement
  const dpr = Math.max(window.devicePixelRatio || 1, 1)

  const cssWidth = props.width ?? (parent ? parent.clientWidth : 600)
  const cssHeight = props.height ?? 240

  c.width = Math.floor(cssWidth * dpr)
  c.height = Math.floor(cssHeight * dpr)
  c.style.width = cssWidth + 'px'
  c.style.height = cssHeight + 'px'

  const ctx = c.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)

  // fill background so exported PNG/JPG isn’t transparent
  ctx.fillStyle = props.backgroundColor
  ctx.fillRect(0, 0, cssWidth, cssHeight)

  // re-apply signature drawing surface
  if (pad) {
    const data = pad.toData()
    pad.clear()
    pad.fromData(data)
  }
}

onMounted(() => {
  if (!canvas.value) return
  pad = new SignaturePad(canvas.value, {
    penColor: props.penColor,
    minWidth: props.lineWidth,
    maxWidth: props.lineWidth,
    throttle: props.throttle ?? 0,
    // @ts-ignore onEnd is not in the declared Options type
    onEnd: () => emit('change', !!pad?.isEmpty()),
  } as any)

  resizeCanvas()
  // keep sharp on container resize
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => resizeCanvas())
    if (canvas.value.parentElement) resizeObserver.observe(canvas.value.parentElement)
  }
  window.addEventListener('resize', resizeCanvas)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCanvas)
  resizeObserver?.disconnect()
  pad?.off()
  pad = null
})

watch(() => props.penColor, (v) => { if (pad) (pad as any).penColor = v })
watch(() => props.lineWidth, (v) => { /* min/max same for consistent line */ })

// ----- Expose handy methods to parent -----
function clear() { pad?.clear(); emit('change', true) }
function isEmpty() { return pad?.isEmpty() ?? true }
function toDataURL(type: ImageType = 'image/png', quality?: number) {
  return pad?.toDataURL(type, quality) ?? ''
}
async function toBlob(type: ImageType = 'image/png', quality?: number): Promise<Blob | null> {
  const dataUrl = toDataURL(type, quality)
  if (!dataUrl) return null
  const res = await fetch(dataUrl)
  return await res.blob()
}

defineExpose({ clear, isEmpty, toDataURL, toBlob })
</script>

<template>
  <!-- Wrapper keeps it Bootstrap-friendly; canvas stretches to width -->
  <div class="border rounded-3 p-2 bg-white">
    <canvas ref="canvas" class="w-100 d-block" style="touch-action: none; cursor: crosshair;"></canvas>
    <div class="d-flex gap-2 mt-2">
      <button type="button" class="btn btn-sm btn-outline-secondary" @click="clear">Clear</button>
    </div>
  </div>
</template>
