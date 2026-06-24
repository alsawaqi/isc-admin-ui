// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  modules: [
    "@pinia/nuxt",
    [
      "nuxt-qrcode",
      {
        options: {
          variant: { inner: "circle", marker: "rounded", pixel: "rounded" },
          radius: 1,
          blackColor: "currentColor",
          whiteColor: "transparent",
        },
      },
    ],
  ],
  vite: {
    optimizeDeps: {
      include: ["@pusher/push-notifications-web"],
    },
  },
  build: {
    transpile: ["@pusher/push-notifications-web"],
  },

  devtools: { enabled: true },

  typescript: {
    strict: true,
  },

  components: true,
  app: {
    head: {
      link: [
        // Icon / fonts / vendor css
        { rel: "stylesheet", href: "/isc-assets/css/remixicon.css" },
        { rel: "stylesheet", href: "/isc-assets/css/lib/bootstrap.min.css" },
        
        { rel: "stylesheet", href: "/isc-assets/css/lib/dataTables.min.css" },
        { rel: "stylesheet", href: "/isc-assets/css/lib/editor-katex.min.css" },
        {
          rel: "stylesheet",
          href: "/isc-assets/css/lib/editor.atom-one-dark.min.css",
        },
        {
          rel: "stylesheet",
          href: "/isc-assets/css/lib/editor.quill.snow.css",
        },
        { rel: "stylesheet", href: "/isc-assets/css/lib/flatpickr.min.css" },
        { rel: "stylesheet", href: "/isc-assets/css/lib/full-calendar.css" },
        {
          rel: "stylesheet",
          href: "/isc-assets/css/lib/jquery-jvectormap-2.0.5.css",
        },
        { rel: "stylesheet", href: "/isc-assets/css/lib/magnific-popup.css" },
        { rel: "stylesheet", href: "/isc-assets/css/lib/slick.css" },
        { rel: "stylesheet", href: "/isc-assets/css/lib/prism.css" },
        { rel: "stylesheet", href: "/isc-assets/css/lib/file-upload.css" },
        { rel: "stylesheet", href: "/isc-assets/css/lib/audioplayer.css" },

        // main theme css (WowDash — legacy)
        { rel: "stylesheet", href: "/isc-assets/css/style.css" },

        // TailAdmin (Tailwind v4) — compiled to /public/tw.css; loaded LAST so its
        // (unlayered) utilities win over WowDash on converted pages.
        { rel: "stylesheet", href: "/tw.css" },
      ],
     
    },
  },

  imports: {
    autoImport: true,
  },

  css: [],
  plugins: ["~/plugins/bootstrap.client.ts"],

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:81",
      r2Url: "https://pub-85c3b7ddc4814c45b25c1a5fb5bdad3f.r2.dev",
      BEAMS_INSTANCE_ID: "e1944000-0a47-4005-9ac3-1f0480b9ae16",
      pusherKey: "5f0de805484e24aaa216",
      pusherCluster: "ap2",
    },
  },

  // you can keep this if you really need it
  compatibilityDate: "2025-03-25",
});
