import { test, expect } from "@playwright/test";

test("seed targets load and terminal mode toggles", async ({ page }) => {
  await page.goto("/");
  
  // Wait for seed targets to load
  await expect(page.locator("h3:has-text('Telegram API')")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("h3:has-text('GitHub')")).toBeVisible();
  await expect(page.locator("h3:has-text('OpenRouter')")).toBeVisible();
  
  // Click Terminal button
  await page.locator('button:has-text("Терминал")').click();
  
  // Verify terminal view appears
  await expect(page.locator("text=webnetchecker — терминал")).toBeVisible({ timeout: 5000 });
  
  // Click back to Cards
  await page.locator('button:has-text("Карточки")').click();
  
  // Verify cards view returns
  await expect(page.locator("h3:has-text('Telegram API')")).toBeVisible();
});