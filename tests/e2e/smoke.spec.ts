import { test, expect } from "@playwright/test";

test("dashboard loads seed targets", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h3:has-text('Telegram API')")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("h3:has-text('GitHub')")).toBeVisible();
  await expect(page.locator("h3:has-text('OpenRouter')")).toBeVisible();
});