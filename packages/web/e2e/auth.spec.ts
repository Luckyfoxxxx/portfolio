import type { Page } from "@playwright/test";
import { test, expect } from "@playwright/test";

const TEST_USER = "testuser";
const TEST_PASS = "testpassword123";

async function login(page: Page) {
  await page.goto("/login");
  await page.fill('input[name="username"]', TEST_USER);
  await page.fill('input[name="password"]', TEST_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/);
}

test("unauthenticated /dashboard redirects to /login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("login page renders username/password form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('input[name="username"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});

test("wrong password shows error and stays on /login", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="username"]', TEST_USER);
  await page.fill('input[name="password"]', "wrongpassword");
  await page.click('button[type="submit"]');
  await expect(page.locator("text=Invalid username or password")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("correct credentials redirects to /dashboard", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/dashboard/);
});

test("after login, /dashboard is accessible without redirect", async ({ page }) => {
  await login(page);
  // Navigate away and back — must not loop to /login
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator("h1")).toContainText("Dashboard");
});

test("logout clears session and redirects to /login", async ({ page }) => {
  await login(page);
  // Call logout endpoint directly
  await page.request.post("/api/auth/logout");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
