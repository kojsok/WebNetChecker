/**
 * Screenshot generator for README.
 * Builds must exist (`npm run build`); the script starts the production server,
 * runs a real scan of the seed catalog and captures the UI in all modes.
 *
 * Usage: node scripts/screenshots.mjs
 */
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "docs", "screenshots");
const PORT = 3222;
const BASE = `http://127.0.0.1:${PORT}`;

mkdirSync(outDir, { recursive: true });

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await wait(300);
  }
  throw new Error(`Server did not start at ${url}`);
}

async function runScanAndSettle(page) {
  await page.getByRole("button", { name: "Запустить проверку" }).click();
  // Ждём завершения скана каталога (66 целей, ~10–30 с).
  await page.getByText("Скан завершён", { exact: false }).waitFor({ timeout: 120_000 });
  await wait(600);
}

async function main() {
  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    cwd: root,
    stdio: "inherit",
  });

  try {
    await waitForServer(BASE);

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.locator("h3:has-text('Telegram API')").waitFor({ timeout: 20_000 });

    // 1. Дашборд в режиме карточек после полного скана.
    await runScanAndSettle(page);
    await page.screenshot({ path: join(outDir, "dashboard-cards.png"), fullPage: false });

    // 2. Терминальный режим.
    await page.getByRole("button", { name: "Терминал" }).click();
    await wait(400);
    await page.screenshot({ path: join(outDir, "dashboard-terminal.png") });
    await page.getByRole("button", { name: "Карточки" }).click();

    // 3. Режим сравнения: две цели + мини-скан.
    await page.getByRole("button", { name: "Сравнение" }).click();
    await page.getByRole("button", { name: "Telegram API" }).click();
    await page.getByRole("button", { name: "GitHub", exact: true }).click();
    await page.getByRole("button", { name: "Запустить тест" }).click();
    await page.getByText("Скан завершён", { exact: false }).waitFor({ timeout: 60_000 });
    await wait(600);
    await page.screenshot({ path: join(outDir, "dashboard-compare.png") });
    await page.getByRole("button", { name: "Карточки" }).click();

    // 4. Диалог добавления целей (закрытие по Escape заодно проверяет a11y).
    await page.getByRole("button", { name: "Добавить цель" }).click();
    await page.getByRole("dialog").waitFor();
    await page.screenshot({ path: join(outDir, "add-targets-dialog.png") });
    await page.keyboard.press("Escape");
    await wait(300);

    // 5. Мобильный вид (результаты подтянутся из кэша последнего скана).
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobile.goto(BASE, { waitUntil: "networkidle" });
    await mobile.locator("h3:has-text('Telegram API')").waitFor({ timeout: 20_000 });
    await wait(800);
    await mobile.screenshot({ path: join(outDir, "dashboard-mobile.png") });

    await browser.close();
    console.log("Screenshots saved to docs/screenshots/");
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});