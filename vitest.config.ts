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
    // FormattedTime 이 브라우저 로컬 timezone 을 쓰므로 runner OS 차이로 date assertion 이 흔들리지 않게 고정.
    env: {
      TZ: "Asia/Seoul",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
