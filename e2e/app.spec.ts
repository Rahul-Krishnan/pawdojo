import { test, expect } from "playwright/test";

test.describe("Pawdojo app", () => {
  test("landing page shows title and get started button", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Pawdojo");
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

  test("progress page shows clickable lesson links under skills", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "rk2211@gmail.com");
    await page.fill('input[type="password"]', "iamnotafool99");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    await page.goto("/progress");

    // Each skill section should contain lesson links
    const lessonLinks = page.locator('a[href^="/lesson/"]');
    const count = await lessonLinks.count();
    expect(count).toBeGreaterThan(0);

    // Click a lesson link and verify it navigates
    await lessonLinks.first().click();
    await page.waitForURL("**/lesson/**");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("dashboard shows completed lessons section with links", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "rk2211@gmail.com");
    await page.fill('input[type="password"]', "iamnotafool99");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    // If there are completed lessons, verify the section exists
    const completedSection = page.locator('text="Completed Lessons"');
    if (await completedSection.isVisible()) {
      // Should have a "View All" link to progress
      await expect(page.locator('a[href="/progress"]:has-text("View All")')).toBeVisible();

      // Completed lesson links should navigate to lesson pages
      const completedLinks = page.locator('section:has-text("Completed Lessons") a[href^="/lesson/"]');
      if ((await completedLinks.count()) > 0) {
        await completedLinks.first().click();
        await page.waitForURL("**/lesson/**");
        // Should show "Practice Again" button for completed lesson
        await expect(
          page.locator('button:has-text("Practice Again")')
        ).toBeVisible();
      }
    }
  });

  test("profile page shows sign out button", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "rk2211@gmail.com");
    await page.fill('input[type="password"]', "iamnotafool99");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    await page.goto("/profile");

    // Should show sign out button
    await expect(page.locator('button:has-text("Sign Out")')).toBeVisible();
  });

  test("unauthenticated access to protected pages redirects to login", async ({
    page,
  }) => {
    // Test all protected routes
    const protectedRoutes = ["/dashboard", "/progress", "/practice", "/profile"];
    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForURL("**/login");
      expect(page.url()).toContain("/login");
    }
  });

  test("invalid lesson ID shows 404", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "rk2211@gmail.com");
    await page.fill('input[type="password"]', "iamnotafool99");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    const response = await page.goto("/lesson/00000000-0000-0000-0000-000000000000");
    // Should show 404
    expect(response?.status()).toBe(404);
  });

  test("lesson back button navigates to dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "rk2211@gmail.com");
    await page.fill('input[type="password"]', "iamnotafool99");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    const lessonLink = page.locator('a[href^="/lesson/"]');
    if ((await lessonLink.count()) > 0) {
      await lessonLink.first().click();
      await page.waitForURL("**/lesson/**");

      // Click back button
      await page.click('a[aria-label="Back to dashboard"]');
      await page.waitForURL("**/dashboard");
    }
  });
});
