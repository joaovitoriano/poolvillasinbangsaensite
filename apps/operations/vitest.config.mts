import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "edge-runtime",
    include: ["tests/**/*.test.ts"],
    env: { WORKOS_OPERATIONS_ORGANIZATION_ID: "org_test" },
  },
});
