import { type Page } from "playwright/test";
import { existsSync } from "node:fs";

// The Playwright runner does not load .env.local the way Next.js does, so load
// it here for any spec that imports these helpers. Skip silently if the file is
// absent (creds may come from the environment, eg in CI).
if (existsSync(".env.local")) {
  (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(
    ".env.local"
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD in .env.local or the environment before running e2e tests.`
    );
  }
  return value;
}

export const TEST_EMAIL = requireEnv("E2E_TEST_EMAIL");
export const TEST_PASSWORD = requireEnv("E2E_TEST_PASSWORD");

export async function login(page: Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");
}
