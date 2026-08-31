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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: '/index.html',
        // No runtime caching rules — the app makes no network requests.
        runtimeCaching: [],
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
