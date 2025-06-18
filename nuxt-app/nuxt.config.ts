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
 
   css: [],
  plugins: ['~/plugins/bootstrap.client.ts'],
   runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'https://api.abdallahweb.com' // your Laravel base URL
    }
  },
  compatibilityDate: '2025-03-25'
})
