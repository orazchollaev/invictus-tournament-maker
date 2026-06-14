import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { fileURLToPath, URL } from "node:url"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: "prompt",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webp,mp3,wav,ogg}"], // ses formatları eklendi
        navigateFallback: null, // itch.io gibi SPA olmayan siteler için fallback devre dışı bırakıldı
      },
      manifest: {
        name: "Invictus - Tournament Maker",
        short_name: "Invictus",
        description: "Tournament maker for football, EAFC, pes and etc.",
        theme_color: "#0d9488",
        background_color: "#d1d6e0",
        display: "standalone",
        orientation: "any",
        icons: [
          {
            src: "icon-192.webp",
            sizes: "192x192",
            type: "image/webp",
          },
          {
            src: "icon-512.webp",
            sizes: "512x512",
            type: "image/webp",
            purpose: "any maskable",
          },
        ],
        screenshots: [],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  base: "./",
  server: {
    host: true,
    port: 2008,
  },
})
