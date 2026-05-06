import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts", "src/**/*.test.ts"],
    // Scheduler tests run pure TS — no DOM needed.
    environment: "node",
    testTimeout: 30_000,
    // Keep run output minimal in CI; verbose is opt-in via --reporter=verbose.
    reporters: ["default"],
  },
});
