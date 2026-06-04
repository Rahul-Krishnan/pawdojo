import { test, expect } from "playwright/test";

test.describe("Auth flow", () => {
  test("login form has email, password, submit, forgot password, and create account", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText("Log In");
    await expect(page.locator('button:has-text("Forgot password?")')).toBeVisible();
    await expect(page.locator('button:has-text("Create an account")')).toBeVisible();
  });

  test("clicking 'Create an account' switches to signup mode", async ({ page }) => {
    await page.goto("/login");

    await page.click('button:has-text("Create an account")');

    // Submit button should now say "Sign Up"
    await expect(page.locator('button[type="submit"]')).toContainText("Sign Up");

    // Should show "Already have an account?" to go back
    await expect(page.locator('button:has-text("Already have an account?")')).toBeVisible();

    // "Forgot password?" should not be visible in signup mode
    await expect(page.locator('button:has-text("Forgot password?")')).not.toBeVisible();
  });

  test("clicking 'Already have an account?' switches back to login mode", async ({ page }) => {
    await page.goto("/login");

    // Switch to signup
    await page.click('button:has-text("Create an account")');
    await expect(page.locator('button[type="submit"]')).toContainText("Sign Up");

    // Switch back to login
    await page.click('button:has-text("Already have an account?")');
    await expect(page.locator('button[type="submit"]')).toContainText("Log In");
    await expect(page.locator('button:has-text("Forgot password?")')).toBeVisible();
  });

  test("clicking 'Forgot password?' switches to forgot mode", async ({ page }) => {
    await page.goto("/login");

    await page.click('button:has-text("Forgot password?")');

    // Submit button should say "Send Reset Link"
    await expect(page.locator('button[type="submit"]')).toContainText("Send Reset Link");

    // Password field should be hidden
    await expect(page.locator('input[type="password"]')).not.toBeVisible();

    // Email field should still be visible
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // Should show "Back to login"
    await expect(page.locator('button:has-text("Back to login")')).toBeVisible();
  });

  test("clicking 'Back to login' returns from forgot mode", async ({ page }) => {
    await page.goto("/login");

    await page.click('button:has-text("Forgot password?")');
    await expect(page.locator('input[type="password"]')).not.toBeVisible();

    await page.click('button:has-text("Back to login")');
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText("Log In");
  });

  test("login with wrong password shows error", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[type="email"]', "rk2211@gmail.com");
    await page.fill('input[type="password"]', "wrongpassword123");
    await page.click('button[type="submit"]');

    // Should show an error message
    await expect(page.locator("text=Invalid login credentials")).toBeVisible({ timeout: 10000 });
  });

  test("login with valid credentials redirects to dashboard", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[type="email"]', "rk2211@gmail.com");
    await page.fill('input[type="password"]', "iamnotafool99");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/dashboard", { timeout: 10000 });
    expect(page.url()).toContain("/dashboard");
  });

  test("authenticated user on /login is redirected to dashboard", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.fill('input[type="email"]', "rk2211@gmail.com");
    await page.fill('input[type="password"]', "iamnotafool99");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    // Going back to /login while authenticated; middleware should 307 us to /dashboard.
    await page.goto("/login");
    await page.waitForURL("**/dashboard");
    expect(page.url()).toContain("/dashboard");
  });

  test("reset password page is accessible", async ({ page }) => {
    await page.goto("/reset-password");

    // Should show the page (not redirect to login) since it's in public paths
    await expect(page.locator("h1")).toContainText("Set New Password");
    await expect(page.locator('input[placeholder="New password"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Confirm new password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText("Update Password");
  });

  test("reset password form validates matching passwords", async ({ page }) => {
    await page.goto("/reset-password");

    await page.fill('input[placeholder="New password"]', "newpass123");
    await page.fill('input[placeholder="Confirm new password"]', "differentpass");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Passwords don't match")).toBeVisible();
  });

  test("sign out button works", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('input[type="email"]', "rk2211@gmail.com");
    await page.fill('input[type="password"]', "iamnotafool99");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    // Go to profile
    await page.goto("/profile");

    // Click sign out
    await page.click('button:has-text("Sign Out")');

    // Should redirect to login
    await page.waitForURL("**/login", { timeout: 10000 });
  });

  test("forgot password submits and shows response", async ({ page }) => {
    await page.goto("/login");

    await page.click('button:has-text("Forgot password?")');
    await page.fill('input[type="email"]', "rk2211@gmail.com");
    await page.click('button[type="submit"]');

    // Should show either success or rate limit message (Supabase rate limits in test)
    await expect(
      page.locator("text=Check your email").or(page.locator("text=rate limit"))
    ).toBeVisible({ timeout: 10000 });
  });
});
