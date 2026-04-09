import { test, expect } from '@playwright/test';

test('app loads without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Wait for React to mount and render visible content
  await expect(page.getByRole('heading', { name: 'Autonomo Tax Prep' })).toBeVisible();

  expect(errors).toHaveLength(0);
});
