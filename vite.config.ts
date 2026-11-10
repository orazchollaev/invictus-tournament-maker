import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { fileURLToPath, URL } from "node:url"

export default defineConfig({
  plugins: [vue()],
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
  build: {
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      // The announcement admin panel ships as a second page of the same build,
      // served at /admin/. See src/admin/.
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        admin: fileURLToPath(new URL("./admin/index.html", import.meta.url)),
      },
    },
  },
})
