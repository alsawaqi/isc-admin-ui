// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
 modules: [
    '@pinia/nuxt',
  ],

  devtools: { enabled: true },
    typescript: {
    strict: true
  },
   imports: {
    autoImport: true,
  },
 
   css: [
    '~/public/isc-assets/css/style.css',
    '~/public/isc-assets/css/remixicon.css',
    '~/public/isc-assets/css/lib/bootstrap.min.css',
    '~/public/isc-assets/css/lib/apexcharts.css',
    '~/public/isc-assets/js/lib/iconify-icon.min.js',
    '~/public/isc-assets/css/lib/dataTables.min.css',
    '~/public/isc-assets/css/lib/editor-katex.min.css',
    '~/public/isc-assets/css/lib/editor.atom-one-dark.min.css',
    '~/public/isc-assets/css/lib/editor.quill.snow.css',
    '~/public/isc-assets/css/lib/flatpickr.min.css',
    '~/public/isc-assets/css/lib/full-calendar.css',
    '~/public/isc-assets/css/lib/jquery-jvectormap-2.0.5.css',
    '~/public/isc-assets/css/lib/magnific-popup.css',
    '~/public/isc-assets/css/lib/slick.css',
    '~/public/isc-assets/css/lib/prism.css',
    '~/public/isc-assets/css/lib/file-upload.css',
    '~/public/isc-assets/css/lib/audioplayer.css'
  ],
  plugins: ['~/plugins/bootstrap.client.ts'],
   runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:81' // your Laravel base URL
    }
  },
  compatibilityDate: '2025-03-25'
})
