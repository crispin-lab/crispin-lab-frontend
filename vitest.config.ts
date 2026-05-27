import path from "node:path";

import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    exclude: [...configDefaults.exclude, "**/.next/**", "**/coverage/**", "**/e2e/**"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
