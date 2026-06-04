import { type Page } from "playwright/test";

// The Playwright runner does not load .env.local the way Next.js does, so load
// it here for any spec that imports these helpers.
(process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(
  ".env.local"
);

export const TEST_EMAIL = process.env.E2E_TEST_EMAIL!;
export const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD!;

export async function login(page: Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");
}
