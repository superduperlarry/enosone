import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 300_000, // dev-server route compiles are slow on first hit
  retries: process.env.CI ? 1 : 0,
  workers: 1, // single shared SQLite DB — keep the smoke serial
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    port: 3000,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      E2E_TEST_MODE: "1",
      DATABASE_PATH: "./.e2e/e2e.db",
      ENOS_BACKEND: "mock",
      STRIPE_SECRET_KEY: "",
      BETTER_AUTH_URL: "http://localhost:3000",
    },
  },
});
