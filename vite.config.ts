import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      workbox: {
        // woff2 is not optional here: the three self-hosted families are
        // the type system (design/00-DESIGN-SYSTEM.md §4), and this app is
        // offline-first by design. Without them precached, an offline
        // launch silently falls back to system fonts.
        // Deliberately no `webp`: that extension is the art (2.2 MB across
        // 16 slots), and precaching it would make a first install pay for
        // decoration on every screen the user may never open. Every art
        // slot has a procedural gradient fallback and an inline LQIP, so
        // a screen is complete before its plate arrives. Art is picked up
        // by the CacheFirst rule below on first view instead.
        // See design/00-DESIGN-SYSTEM.md §2.6.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // The app still makes no *data* requests — this is same-origin
            // art only, and it is immutable: Vite content-hashes every
            // filename, so a changed plate is a new URL and CacheFirst can
            // never serve a stale one.
            urlPattern: /\.webp$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'system-art-v1',
              // 16 slots x 2 widths = 32, plus headroom for new plates.
              expiration: { maxEntries: 48, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
      manifest: {
        id: '/',
        name: 'SYSTEM',
        short_name: 'SYSTEM',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0A0B0D',
        theme_color: '#0A0B0D',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          { name: 'Log problem', url: '/log/problem' },
          { name: 'Log application', url: '/log/application' },
          { name: 'Evening review', url: '/review' },
        ],
      },
    }),
  ],
});
