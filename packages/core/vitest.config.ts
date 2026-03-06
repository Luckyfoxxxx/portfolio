import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/calculations/**"],
      thresholds: {
        branches: 80,
        functions: 90,
        lines: 85,
        statements: 85,
      },
    },
  },
});
