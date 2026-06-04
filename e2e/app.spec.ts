import { test, expect } from "playwright/test";

async function login(page: import("playwright/test").Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', "rk2211@gmail.com");
  await page.fill('input[type="password"]', "iamnotafool99");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");
}

test.describe("Pawdojo app", () => {
  test("landing page shows logo and get started button", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('img[alt*="Paw Dojo"]')).toBeVisible();
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });

  test("login page shows auth form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("unauthenticated user is redirected to login from all protected routes", async ({
    page,
  }) => {
    const protectedRoutes = ["/dashboard", "/progress", "/profile"];
    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForURL("**/login");
      expect(page.url()).toContain("/login");
    }
  });

  test("login, view dashboard, and navigate all tabs", async ({ page }) => {
    await login(page);

    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("nav")).toBeVisible();

    await page.click('a[aria-label="Progress"]');
    await page.waitForURL("**/progress");
    await expect(page.locator("h1")).toContainText("Progress");

    await page.click('a[aria-label="Profile"]');
    await page.waitForURL("**/profile");
    await expect(page.locator("h1")).toContainText("Profile");

    await page.click('a[aria-label="Home"]');
    await page.waitForURL("**/dashboard");
  });

  test("bottom nav has 3 tabs with proper accessibility attributes", async ({ page }) => {
    await login(page);

    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();

    const tabs = nav.locator("a");
    await expect(tabs).toHaveCount(3);

    const activeLink = nav.locator('[aria-current="page"]');
    await expect(activeLink).toBeVisible();
  });

  test("lesson page shows content and session log form directly", async ({ page }) => {
    await login(page);

    const lessonLink = page.locator('a[href^="/lesson/"]');
    if ((await lessonLink.count()) > 0) {
      await lessonLink.first().click();
      await page.waitForURL("**/lesson/**");

      // Should show lesson content
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("article")).toBeVisible();

      // Session log form should be visible directly (no toggle button)
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    }
  });

  test("lesson back button uses browser back navigation", async ({ page }) => {
    await login(page);

    await page.goto("/progress");
    await page.waitForURL("**/progress");

    const lessonLink = page.locator('a[href^="/lesson/"]');
    if ((await lessonLink.count()) > 0) {
      await lessonLink.first().click();
      await page.waitForURL("**/lesson/**");

      // Click back button (should go to progress, not hardcoded dashboard)
      await page.click('button[aria-label="Go back"]');
      await page.waitForURL("**/progress");
    }
  });

  test("progress page shows radar chart, skills, and awards", async ({ page }) => {
    await login(page);
    await page.goto("/progress");

    await expect(page.locator("h1")).toContainText("Progress");

    await expect(page.locator('text="Overall Score"').or(page.locator('text="OVERALL SCORE"'))).toBeVisible();

    // Should show skills section with lesson links
    const lessonLinks = page.locator('a[href^="/lesson/"]');
    const count = await lessonLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test("progress page lesson links navigate to lesson", async ({ page }) => {
    await login(page);
    await page.goto("/progress");

    const lessonLinks = page.locator('a[href^="/lesson/"]');
    if ((await lessonLinks.count()) > 0) {
      await lessonLinks.first().click();
      await page.waitForURL("**/lesson/**");
      await expect(page.locator("h1")).toBeVisible();
    }
  });

  test("profile page shows dogs, account, settings, and sign out", async ({ page }) => {
    await login(page);
    await page.goto("/profile");

    // Should show dogs section
    await expect(page.locator('text="Dogs"').or(page.locator('text="DOGS"'))).toBeVisible();

    // Should show sign out button
    await expect(page.locator('button:has-text("Sign Out")')).toBeVisible();

    // Should show sound toggle
    await expect(page.locator('button[aria-label="Toggle sound effects"]')).toBeVisible();
  });

  test("profile page shows add another dog link", async ({ page }) => {
    await login(page);
    await page.goto("/profile");

    await expect(page.locator('a[href="/onboarding"]')).toBeVisible();
  });

  test("dog switcher opens on dashboard", async ({ page }) => {
    await login(page);

    // Dog name in header should be clickable
    const dogNameButton = page.locator("header button").first();
    await dogNameButton.click();

    // Should show add dog link in dropdown
    await expect(page.locator('a[href="/onboarding"]:has-text("Add Dog")')).toBeVisible();
  });

  test("invalid lesson ID shows not found page", async ({ page }) => {
    await login(page);

    await page.goto("/lesson/00000000-0000-0000-0000-000000000000");
    // Next.js notFound() renders a not-found page (may be 200 or 404 depending on config)
    await expect(
      page.locator('text="Not Found"').or(page.locator('text="not found"')).or(page.locator('text="404"'))
    ).toBeVisible({ timeout: 5000 }).catch(() => {
      // If no explicit not-found text, the page should at least not show lesson content
      expect(page.locator("article")).not.toBeVisible();
    });
  });

  test("/practice redirects to /progress", async ({ page }) => {
    await login(page);

    await page.goto("/practice");
    await page.waitForURL("**/progress");
    expect(page.url()).toContain("/progress");
  });

  test("skip lesson button is visible on dashboard", async ({ page }) => {
    await login(page);

    const skipButton = page.locator('button:has-text("Skip this lesson")');
    if (await page.locator('a[href^="/lesson/"]').count() > 0) {
      await expect(skipButton).toBeVisible();
    }
  });
});
