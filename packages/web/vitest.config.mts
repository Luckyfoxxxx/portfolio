import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    passWithNoTests: true,
    exclude: ["**/node_modules/**", "**/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["components/**", "lib/**"],
      thresholds: {
        branches: 80,
        functions: 90,
        lines: 85,
        statements: 85,
      },
    },
  },
  resolve: {
    alias: {
      "@": "/home/lucky/projects/portfolio/packages/web",
    },
  },
});
