// snuxt.config.ts

import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
 compatibilityDate: '2025-08-17',
  devtools: { enabled: true },
  typescript: { strict: true },
  css: [
    // Leaflet CSS so markers/tiles render correctly
    'leaflet/dist/leaflet.css'
  ],
  runtimeConfig: {
    public: {
      // You can switch to direct calls by setting API_BASE to 'https://www.refuges.info/api'
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api/refuges'
    }
  }
})