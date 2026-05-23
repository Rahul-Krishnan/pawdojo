import { test, expect } from "playwright/test";

test.describe("Goodboy app", () => {
  test("landing page shows title and get started button", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Goodboy");
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });

  test("login page shows auth form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("unauthenticated user is redirected to login from dashboard", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login");
    expect(page.url()).toContain("/login");
  });

  test("login, view dashboard, and navigate all tabs", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('input[type="email"]', "rk2211@gmail.com");
    await page.fill('input[type="password"]', "iamnotafool99");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    // Dashboard should show dog name and streak/XP cards
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("nav")).toBeVisible();

    // Navigate to Practice
    await page.click('a[aria-label="Practice"]');
    await page.waitForURL("**/practice");
    await expect(page.locator("h1")).toContainText("Practice");

    // Navigate to Progress
    await page.click('a[aria-label="Progress"]');
    await page.waitForURL("**/progress");
    await expect(page.locator("h1")).toContainText("Progress");

    // Navigate to Profile
    await page.click('a[aria-label="Profile"]');
    await page.waitForURL("**/profile");
    await expect(page.locator("h1")).toContainText("Profile");

    // Navigate back to Home
    await page.goto("/dashboard");
    await page.waitForURL("**/dashboard");
  });

  test("lesson page shows content and training button", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.fill('input[type="email"]', "rk2211@gmail.com");
    await page.fill('input[type="password"]', "iamnotafool99");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    // Click the lesson card
    const lessonLink = page.locator('a[href^="/lesson/"]');
    if ((await lessonLink.count()) > 0) {
      await lessonLink.click();
      await page.waitForURL("**/lesson/**");

      // Should show lesson content
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("article")).toBeVisible();

      // Should show training button
      const trainButton = page.locator(
        'button:has-text("trained"), button:has-text("Practice")'
      );
      await expect(trainButton).toBeVisible();
    }
  });

  test("progress page shows skills and badges", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "rk2211@gmail.com");
    await page.fill('input[type="password"]', "iamnotafool99");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    await page.goto("/progress");

    // Should show stats section
    await expect(page.locator("h1")).toContainText("Progress");

    // Should show skills section
    await expect(page.locator('text="Skills"').or(page.locator('text="SKILLS"'))).toBeVisible();

    // Should show badges section
    await expect(page.locator('text="Badges"').or(page.locator('text="BADGES"'))).toBeVisible();
  });

  test("profile page shows settings panel with sound and theme toggles", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "rk2211@gmail.com");
    await page.fill('input[type="password"]', "iamnotafool99");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    await page.goto("/profile");

    // Should show sound toggle
    await expect(
      page.locator('button[aria-label="Toggle sound effects"]')
    ).toBeVisible();

    // Should show theme selector
    await expect(page.locator('button:has-text("light")')).toBeVisible();
    await expect(page.locator('button:has-text("dark")')).toBeVisible();
    await expect(page.locator('button:has-text("system")')).toBeVisible();
  });

  test("bottom nav has proper accessibility attributes", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "rk2211@gmail.com");
    await page.fill('input[type="password"]', "iamnotafool99");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();

    // Active tab should have aria-current
    const activeLink = nav.locator('[aria-current="page"]');
    await expect(activeLink).toBeVisible();
  });
});
