import { test, expect } from '@playwright/test';

const PASSWORD = 'autonomo2026';

test('app loads without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Get past password gate
  const passwordInput = page.locator('input[type="password"]');
  if (await passwordInput.isVisible()) {
    await passwordInput.fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
  }

  await expect(page.locator('h1')).toContainText('Autónomo Tax Prep');

  const realErrors = errors.filter(e =>
    !e.includes('demo.supabase.co') &&
    !e.includes('favicon') &&
    !e.includes('Manifest')
  );
  expect(realErrors).toHaveLength(0);
});
