import { test, expect } from "@playwright/test";
import { createDevSessionCookie } from "./helpers/session";

test.beforeEach(async ({ context }) => {
  const cookie = await createDevSessionCookie();
  await context.addCookies([cookie]);
});

test("dashboard shell loads and navigation works", async ({ page }) => {
  await page.goto("/overview");

  await expect(page.getByText("Good morning,")).toBeVisible();

  for (const label of ["Overview", "Inbox", "Jobs", "Applications"]) {
    await expect(page.getByRole("link", { name: label, exact: true })).toBeVisible();
  }

  await page.getByRole("link", { name: "Jobs", exact: true }).click();
  await expect(page).toHaveURL(/\/jobs$/);
});

test("command palette opens and closes", async ({ page }) => {
  await page.goto("/overview");

  // Wait for client hydration (the keydown listener is attached by a client
  // component) before relying on the keyboard shortcut.
  const searchTrigger = page.getByText("Search jobs, emails…");
  await expect(searchTrigger).toBeVisible();
  await searchTrigger.click();

  const palette = page.getByPlaceholder(/Search jobs, emails, companies/);
  await expect(palette).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(palette).not.toBeVisible();
});
