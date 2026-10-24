import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Update the app automatically when a new version is deployed
      registerType: "autoUpdate",

      // Extra files from public/ to save for offline use
      includeAssets: ["favicon.ico", "favicon.svg", "apple-touch-icon.png"],

      // The "ID card" of the app: name, colors, icons
      manifest: {
        name: "FreshMart POS",
        short_name: "FreshMart",
        description: "Supermarket point of sale",
        theme_color: "#4E342E",
        background_color: "#F8F4E7",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        scope: "/",
        id: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      // The service worker: what to save, and how to handle requests
      workbox: {
        // Save the app's own files so it opens offline
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],

        // Any page like /checkout or /products opens index.html when offline
        navigateFallback: "/index.html",

        // API data (products, categories, offline sales) is stored by the app
        // itself in IndexedDB (src/offline), so only fonts are cached here.
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin === "https://fonts.googleapis.com" ||
              url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      // Let the PWA work while running npm run dev too
      devOptions: {
        enabled: true,
      },
    }),
  ],

  // Always use ONE copy of React, even inside packages like dexie-react-hooks
  resolve: {
    dedupe: ["react", "react-dom"],
  },

  // Prepare these packages up front, so Vite doesn't re-prepare them mid-session
  optimizeDeps: {
    include: ["react", "react-dom", "dexie", "dexie-react-hooks"],
  },
});