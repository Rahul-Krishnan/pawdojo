import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // The suite runs against one shared Supabase instance and a single test
  // account. Specs seed and restore the same dog_streaks row in beforeAll/
  // afterAll, so running files on separate workers lets their upserts clobber
  // each other (a non-deterministic race). One worker forces serial execution.
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 390, height: 844 },
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
