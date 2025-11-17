<script setup lang="ts">
import '@/assets/css/nprogress-custom.css'
import { useHead } from 'nuxt/app'
useHead({
  link: [
          {
            rel: 'stylesheet',
            href: 'https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/katex.min.css'
          },
          { rel: 'stylesheet', href: '/isc-assets/css/style.css' },
          { rel: 'stylesheet', href: '/isc-assets/css/remixicon.css' },
          { rel: 'stylesheet', href: '/isc-assets/css/lib/bootstrap.min.css' },
          { rel: 'stylesheet', href: '/isc-assets/css/lib/apexcharts.css' },
          { rel: 'stylesheet', href: '/isc-assets/css/lib/dataTables.min.css' },
          { rel: 'stylesheet', href: '/isc-assets/css/lib/flatpickr.min.css' },
          { rel: 'stylesheet', href: '/isc-assets/css/lib/full-calendar.css' },
          { rel: 'stylesheet', href: '/isc-assets/css/lib/jquery-jvectormap-2.0.5.css' },
          { rel: 'stylesheet', href: '/isc-assets/css/lib/magnific-popup.css' },
          { rel: 'stylesheet', href: '/isc-assets/css/lib/slick.css' },
          { rel: 'stylesheet', href: '/isc-assets/css/lib/prism.css' },
          { rel: 'stylesheet', href: '/isc-assets/css/lib/file-upload.css' },
          { rel: 'stylesheet', href: '/isc-assets/css/lib/audioplayer.css' },
          { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/katex.min.css' }
  ]
})
 
 if (import.meta.client) {
    const scripts = [
      '/isc-assets/js/lib/jquery-3.7.1.min.js',
      '/isc-assets/js/lib/bootstrap.bundle.min.js',
      '/isc-assets/js/lib/apexcharts.min.js',
      '/isc-assets/js/lib/dataTables.min.js',
      '/isc-assets/js/lib/iconify-icon.min.js',
      '/isc-assets/js/lib/jquery-ui.min.js',
      '/isc-assets/js/lib/jquery-jvectormap-2.0.5.min.js',
      '/isc-assets/js/lib/jquery-jvectormap-world-mill-en.js',
      '/isc-assets/js/lib/magnifc-popup.min.js',
      '/isc-assets/js/lib/slick.min.js',
      '/isc-assets/js/lib/prism.js',
      '/isc-assets/js/lib/file-upload.js',
      '/isc-assets/js/lib/audioplayer.js',
      '/isc-assets/js/app.js'
    ]

  scripts.forEach(src => {
    const script = document.createElement('script')
    script.src = src
    script.async = false
    document.body.appendChild(script)
  })
}
</script>
<template>

  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  
</template>
<style>

body {
  background-color: var(--bg-color);
  color: var(--text-secondary-light);
  font-family: "Inter", sans-serif;
  font-size: 1rem;
  padding: 0;
  margin: 0;
  font-weight: 400;
  position: relative;
  line-height: 1.7;
  overflow-x: hidden;
}
</style>
