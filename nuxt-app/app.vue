<script setup lang="ts">
 
 if (process.client) {
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
