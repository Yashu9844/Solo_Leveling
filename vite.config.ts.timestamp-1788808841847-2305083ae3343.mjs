// vite.config.ts
import { defineConfig } from "file:///C:/Users/yashwanth/Desktop/Solo_leveling/node_modules/vite/dist/node/index.js";

// package.json
var package_default = {
  name: "system",
  private: true,
  version: "0.0.1",
  type: "module",
  scripts: {
    dev: "vite",
    build: "tsc -b && vite build",
    preview: "vite preview",
    test: "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    lint: "eslint .",
    typecheck: "tsc -b",
    verify: "npm run typecheck && npm run lint && npm run test && npm run build",
    art: "node scripts/import-art.mjs"
  },
  dependencies: {
    "@fontsource/cormorant-garamond": "^5.3.0",
    "@fontsource/inter": "^5.3.0",
    "@fontsource/jetbrains-mono": "^5.3.0",
    "@phosphor-icons/react": "^2.1.10",
    "date-fns": "^3.6.0",
    "date-fns-tz": "^3.2.0",
    dexie: "^4.0.10",
    "framer-motion": "^11.18.2",
    react: "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    uuid: "^10.0.0",
    zustand: "^4.5.5"
  },
  devDependencies: {
    "@eslint/js": "^9.15.0",
    "@playwright/test": "^1.49.0",
    "@types/node": "^22.9.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@types/uuid": "^10.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "@vitest/coverage-v8": "^2.1.5",
    autoprefixer: "^10.4.20",
    eslint: "^9.15.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "fake-indexeddb": "^6.0.0",
    "fast-check": "^3.23.1",
    postcss: "^8.4.49",
    sharp: "^0.35.4",
    tailwindcss: "^3.4.15",
    typescript: "^5.6.3",
    "typescript-eslint": "^8.15.0",
    vite: "^5.4.11",
    "vite-plugin-pwa": "^0.21.1",
    vitest: "^2.1.5"
  }
};

// vite.config.ts
import react from "file:///C:/Users/yashwanth/Desktop/Solo_leveling/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///C:/Users/yashwanth/Desktop/Solo_leveling/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  // The About screen prints a real version rather than a hardcoded
  // string that would drift the first time package.json moved.
  define: { __APP_VERSION__: JSON.stringify(package_default.version) },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: "auto",
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
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,woff2}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            // The app still makes no *data* requests — this is same-origin
            // art only, and it is immutable: Vite content-hashes every
            // filename, so a changed plate is a new URL and CacheFirst can
            // never serve a stale one.
            urlPattern: /\.webp$/,
            handler: "CacheFirst",
            options: {
              cacheName: "system-art-v1",
              // 16 slots x 2 widths = 32, plus headroom for new plates.
              expiration: { maxEntries: 48, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      },
      manifest: {
        id: "/",
        name: "SYSTEM",
        short_name: "SYSTEM",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0A0B0D",
        theme_color: "#0A0B0D",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ],
        shortcuts: [
          { name: "Log problem", url: "/log/problem" },
          { name: "Log application", url: "/log/application" },
          { name: "Evening review", url: "/review" }
        ]
      }
    })
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAicGFja2FnZS5qc29uIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxceWFzaHdhbnRoXFxcXERlc2t0b3BcXFxcU29sb19sZXZlbGluZ1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxceWFzaHdhbnRoXFxcXERlc2t0b3BcXFxcU29sb19sZXZlbGluZ1xcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMveWFzaHdhbnRoL0Rlc2t0b3AvU29sb19sZXZlbGluZy92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xyXG5pbXBvcnQgcGtnIGZyb20gJy4vcGFja2FnZS5qc29uJztcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcclxuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIC8vIFRoZSBBYm91dCBzY3JlZW4gcHJpbnRzIGEgcmVhbCB2ZXJzaW9uIHJhdGhlciB0aGFuIGEgaGFyZGNvZGVkXHJcbiAgLy8gc3RyaW5nIHRoYXQgd291bGQgZHJpZnQgdGhlIGZpcnN0IHRpbWUgcGFja2FnZS5qc29uIG1vdmVkLlxyXG4gIGRlZmluZTogeyBfX0FQUF9WRVJTSU9OX186IEpTT04uc3RyaW5naWZ5KHBrZy52ZXJzaW9uKSB9LFxyXG4gIHBsdWdpbnM6IFtcclxuICAgIHJlYWN0KCksXHJcbiAgICBWaXRlUFdBKHtcclxuICAgICAgcmVnaXN0ZXJUeXBlOiAncHJvbXB0JyxcclxuICAgICAgaW5qZWN0UmVnaXN0ZXI6ICdhdXRvJyxcclxuICAgICAgd29ya2JveDoge1xyXG4gICAgICAgIC8vIHdvZmYyIGlzIG5vdCBvcHRpb25hbCBoZXJlOiB0aGUgdGhyZWUgc2VsZi1ob3N0ZWQgZmFtaWxpZXMgYXJlXHJcbiAgICAgICAgLy8gdGhlIHR5cGUgc3lzdGVtIChkZXNpZ24vMDAtREVTSUdOLVNZU1RFTS5tZCBcdTAwQTc0KSwgYW5kIHRoaXMgYXBwIGlzXHJcbiAgICAgICAgLy8gb2ZmbGluZS1maXJzdCBieSBkZXNpZ24uIFdpdGhvdXQgdGhlbSBwcmVjYWNoZWQsIGFuIG9mZmxpbmVcclxuICAgICAgICAvLyBsYXVuY2ggc2lsZW50bHkgZmFsbHMgYmFjayB0byBzeXN0ZW0gZm9udHMuXHJcbiAgICAgICAgLy8gRGVsaWJlcmF0ZWx5IG5vIGB3ZWJwYDogdGhhdCBleHRlbnNpb24gaXMgdGhlIGFydCAoMi4yIE1CIGFjcm9zc1xyXG4gICAgICAgIC8vIDE2IHNsb3RzKSwgYW5kIHByZWNhY2hpbmcgaXQgd291bGQgbWFrZSBhIGZpcnN0IGluc3RhbGwgcGF5IGZvclxyXG4gICAgICAgIC8vIGRlY29yYXRpb24gb24gZXZlcnkgc2NyZWVuIHRoZSB1c2VyIG1heSBuZXZlciBvcGVuLiBFdmVyeSBhcnRcclxuICAgICAgICAvLyBzbG90IGhhcyBhIHByb2NlZHVyYWwgZ3JhZGllbnQgZmFsbGJhY2sgYW5kIGFuIGlubGluZSBMUUlQLCBzb1xyXG4gICAgICAgIC8vIGEgc2NyZWVuIGlzIGNvbXBsZXRlIGJlZm9yZSBpdHMgcGxhdGUgYXJyaXZlcy4gQXJ0IGlzIHBpY2tlZCB1cFxyXG4gICAgICAgIC8vIGJ5IHRoZSBDYWNoZUZpcnN0IHJ1bGUgYmVsb3cgb24gZmlyc3QgdmlldyBpbnN0ZWFkLlxyXG4gICAgICAgIC8vIFNlZSBkZXNpZ24vMDAtREVTSUdOLVNZU1RFTS5tZCBcdTAwQTcyLjYuXHJcbiAgICAgICAgZ2xvYlBhdHRlcm5zOiBbJyoqLyoue2pzLGNzcyxodG1sLGljbyxwbmcsc3ZnLHdlYm1hbmlmZXN0LHdvZmYyfSddLFxyXG4gICAgICAgIG5hdmlnYXRlRmFsbGJhY2s6ICcvaW5kZXguaHRtbCcsXHJcbiAgICAgICAgcnVudGltZUNhY2hpbmc6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgLy8gVGhlIGFwcCBzdGlsbCBtYWtlcyBubyAqZGF0YSogcmVxdWVzdHMgXHUyMDE0IHRoaXMgaXMgc2FtZS1vcmlnaW5cclxuICAgICAgICAgICAgLy8gYXJ0IG9ubHksIGFuZCBpdCBpcyBpbW11dGFibGU6IFZpdGUgY29udGVudC1oYXNoZXMgZXZlcnlcclxuICAgICAgICAgICAgLy8gZmlsZW5hbWUsIHNvIGEgY2hhbmdlZCBwbGF0ZSBpcyBhIG5ldyBVUkwgYW5kIENhY2hlRmlyc3QgY2FuXHJcbiAgICAgICAgICAgIC8vIG5ldmVyIHNlcnZlIGEgc3RhbGUgb25lLlxyXG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXFwud2VicCQvLFxyXG4gICAgICAgICAgICBoYW5kbGVyOiAnQ2FjaGVGaXJzdCcsXHJcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICBjYWNoZU5hbWU6ICdzeXN0ZW0tYXJ0LXYxJyxcclxuICAgICAgICAgICAgICAvLyAxNiBzbG90cyB4IDIgd2lkdGhzID0gMzIsIHBsdXMgaGVhZHJvb20gZm9yIG5ldyBwbGF0ZXMuXHJcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjogeyBtYXhFbnRyaWVzOiA0OCwgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzY1IH0sXHJcbiAgICAgICAgICAgICAgY2FjaGVhYmxlUmVzcG9uc2U6IHsgc3RhdHVzZXM6IFswLCAyMDBdIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0sXHJcbiAgICAgIGRldk9wdGlvbnM6IHtcclxuICAgICAgICBlbmFibGVkOiBmYWxzZSxcclxuICAgICAgfSxcclxuICAgICAgbWFuaWZlc3Q6IHtcclxuICAgICAgICBpZDogJy8nLFxyXG4gICAgICAgIG5hbWU6ICdTWVNURU0nLFxyXG4gICAgICAgIHNob3J0X25hbWU6ICdTWVNURU0nLFxyXG4gICAgICAgIHN0YXJ0X3VybDogJy8nLFxyXG4gICAgICAgIHNjb3BlOiAnLycsXHJcbiAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxyXG4gICAgICAgIG9yaWVudGF0aW9uOiAncG9ydHJhaXQnLFxyXG4gICAgICAgIGJhY2tncm91bmRfY29sb3I6ICcjMEEwQjBEJyxcclxuICAgICAgICB0aGVtZV9jb2xvcjogJyMwQTBCMEQnLFxyXG4gICAgICAgIGljb25zOiBbXHJcbiAgICAgICAgICB7IHNyYzogJy9pY29uLTE5Mi5wbmcnLCBzaXplczogJzE5MngxOTInLCB0eXBlOiAnaW1hZ2UvcG5nJyB9LFxyXG4gICAgICAgICAgeyBzcmM6ICcvaWNvbi01MTIucG5nJywgc2l6ZXM6ICc1MTJ4NTEyJywgdHlwZTogJ2ltYWdlL3BuZycgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgc3JjOiAnL2ljb24tbWFza2FibGUtNTEyLnBuZycsXHJcbiAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXHJcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnLFxyXG4gICAgICAgICAgICBwdXJwb3NlOiAnbWFza2FibGUnLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHNob3J0Y3V0czogW1xyXG4gICAgICAgICAgeyBuYW1lOiAnTG9nIHByb2JsZW0nLCB1cmw6ICcvbG9nL3Byb2JsZW0nIH0sXHJcbiAgICAgICAgICB7IG5hbWU6ICdMb2cgYXBwbGljYXRpb24nLCB1cmw6ICcvbG9nL2FwcGxpY2F0aW9uJyB9LFxyXG4gICAgICAgICAgeyBuYW1lOiAnRXZlbmluZyByZXZpZXcnLCB1cmw6ICcvcmV2aWV3JyB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0sXHJcbiAgICB9KSxcclxuICBdLFxyXG59KTtcclxuIiwgIntcbiAgXCJuYW1lXCI6IFwic3lzdGVtXCIsXG4gIFwicHJpdmF0ZVwiOiB0cnVlLFxuICBcInZlcnNpb25cIjogXCIwLjAuMVwiLFxuICBcInR5cGVcIjogXCJtb2R1bGVcIixcbiAgXCJzY3JpcHRzXCI6IHtcbiAgICBcImRldlwiOiBcInZpdGVcIixcbiAgICBcImJ1aWxkXCI6IFwidHNjIC1iICYmIHZpdGUgYnVpbGRcIixcbiAgICBcInByZXZpZXdcIjogXCJ2aXRlIHByZXZpZXdcIixcbiAgICBcInRlc3RcIjogXCJ2aXRlc3QgcnVuXCIsXG4gICAgXCJ0ZXN0OndhdGNoXCI6IFwidml0ZXN0XCIsXG4gICAgXCJ0ZXN0OmUyZVwiOiBcInBsYXl3cmlnaHQgdGVzdFwiLFxuICAgIFwibGludFwiOiBcImVzbGludCAuXCIsXG4gICAgXCJ0eXBlY2hlY2tcIjogXCJ0c2MgLWJcIixcbiAgICBcInZlcmlmeVwiOiBcIm5wbSBydW4gdHlwZWNoZWNrICYmIG5wbSBydW4gbGludCAmJiBucG0gcnVuIHRlc3QgJiYgbnBtIHJ1biBidWlsZFwiLFxuICAgIFwiYXJ0XCI6IFwibm9kZSBzY3JpcHRzL2ltcG9ydC1hcnQubWpzXCJcbiAgfSxcbiAgXCJkZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiQGZvbnRzb3VyY2UvY29ybW9yYW50LWdhcmFtb25kXCI6IFwiXjUuMy4wXCIsXG4gICAgXCJAZm9udHNvdXJjZS9pbnRlclwiOiBcIl41LjMuMFwiLFxuICAgIFwiQGZvbnRzb3VyY2UvamV0YnJhaW5zLW1vbm9cIjogXCJeNS4zLjBcIixcbiAgICBcIkBwaG9zcGhvci1pY29ucy9yZWFjdFwiOiBcIl4yLjEuMTBcIixcbiAgICBcImRhdGUtZm5zXCI6IFwiXjMuNi4wXCIsXG4gICAgXCJkYXRlLWZucy10elwiOiBcIl4zLjIuMFwiLFxuICAgIFwiZGV4aWVcIjogXCJeNC4wLjEwXCIsXG4gICAgXCJmcmFtZXItbW90aW9uXCI6IFwiXjExLjE4LjJcIixcbiAgICBcInJlYWN0XCI6IFwiXjE4LjMuMVwiLFxuICAgIFwicmVhY3QtZG9tXCI6IFwiXjE4LjMuMVwiLFxuICAgIFwicmVhY3Qtcm91dGVyLWRvbVwiOiBcIl42LjI4LjBcIixcbiAgICBcInV1aWRcIjogXCJeMTAuMC4wXCIsXG4gICAgXCJ6dXN0YW5kXCI6IFwiXjQuNS41XCJcbiAgfSxcbiAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiQGVzbGludC9qc1wiOiBcIl45LjE1LjBcIixcbiAgICBcIkBwbGF5d3JpZ2h0L3Rlc3RcIjogXCJeMS40OS4wXCIsXG4gICAgXCJAdHlwZXMvbm9kZVwiOiBcIl4yMi45LjBcIixcbiAgICBcIkB0eXBlcy9yZWFjdFwiOiBcIl4xOC4zLjEyXCIsXG4gICAgXCJAdHlwZXMvcmVhY3QtZG9tXCI6IFwiXjE4LjMuMVwiLFxuICAgIFwiQHR5cGVzL3V1aWRcIjogXCJeMTAuMC4wXCIsXG4gICAgXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiOiBcIl40LjMuNFwiLFxuICAgIFwiQHZpdGVzdC9jb3ZlcmFnZS12OFwiOiBcIl4yLjEuNVwiLFxuICAgIFwiYXV0b3ByZWZpeGVyXCI6IFwiXjEwLjQuMjBcIixcbiAgICBcImVzbGludFwiOiBcIl45LjE1LjBcIixcbiAgICBcImVzbGludC1wbHVnaW4tcmVhY3QtaG9va3NcIjogXCJeNS4wLjBcIixcbiAgICBcImZha2UtaW5kZXhlZGRiXCI6IFwiXjYuMC4wXCIsXG4gICAgXCJmYXN0LWNoZWNrXCI6IFwiXjMuMjMuMVwiLFxuICAgIFwicG9zdGNzc1wiOiBcIl44LjQuNDlcIixcbiAgICBcInNoYXJwXCI6IFwiXjAuMzUuNFwiLFxuICAgIFwidGFpbHdpbmRjc3NcIjogXCJeMy40LjE1XCIsXG4gICAgXCJ0eXBlc2NyaXB0XCI6IFwiXjUuNi4zXCIsXG4gICAgXCJ0eXBlc2NyaXB0LWVzbGludFwiOiBcIl44LjE1LjBcIixcbiAgICBcInZpdGVcIjogXCJeNS40LjExXCIsXG4gICAgXCJ2aXRlLXBsdWdpbi1wd2Fc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
