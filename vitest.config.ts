import { defineConfig } from "vitest/config"
import vue from "@vitejs/plugin-vue"
import { fileURLToPath, URL } from "node:url"

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/__tests__/*.test.ts"],
    // The statistical suites play hundreds of matches per case, and the Excel
    // export builds a real workbook. Both sit near the 5s default once the
    // pool is running several files at once, which made them fail by timeout
    // rather than by assertion.
    testTimeout: 30000,
  },
})
