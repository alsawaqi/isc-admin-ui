// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
 modules: [
    '@pinia/nuxt',
    ['nuxt-qrcode', {
      options: {
        // variant: 'pixelated',
        variant: { inner: 'circle', marker: 'rounded', pixel: 'rounded' },
        radius: 1,
        blackColor: 'currentColor',
        whiteColor: 'transparent',
      }
    }],
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
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:81', // your Laravel base URL
      r2Url: 'https://pub-85c3b7ddc4814c45b25c1a5fb5bdad3f.r2.dev',
    }
  },
  compatibilityDate: '2025-03-25'
})
