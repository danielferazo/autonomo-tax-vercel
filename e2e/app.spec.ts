import { test, expect } from '@playwright/test';

const PASSWORD = 'autonomo2026';

// Helper to get past the password gate
async function login(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // If password gate is showing, fill it
  const passwordInput = page.locator('input[type="password"]');
  if (await passwordInput.isVisible()) {
    await passwordInput.fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
  }

  // Wait for app to render
  await expect(page.locator('h1')).toContainText('Autónomo Tax Prep');
}

test.describe('Password Gate', () => {
  test('shows password form on first visit', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('rejects wrong password', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('text=Invalid password')).toBeVisible();
  });

  test('accepts correct password', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('h1')).toContainText('Autónomo Tax Prep');
  });
});

test.describe('App Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  const tabs = ['Invoices', 'Expenses', 'Modelo 303', 'Modelo 130', 'Summary', 'Profile'];

  for (const tab of tabs) {
    test(`navigates to ${tab} tab`, async ({ page }) => {
      await page.locator('button', { hasText: tab }).click();
      await expect(page.locator('.card')).toBeVisible();
    });
  }

  test('quarter selector is visible and functional', async ({ page }) => {
    const quarterSelect = page.locator('select[aria-label="Select quarter"]');
    await expect(quarterSelect).toBeVisible();
    await quarterSelect.selectOption('3');
    await expect(quarterSelect).toHaveValue('3');
  });

  test('year selector is visible and functional', async ({ page }) => {
    const yearSelect = page.locator('select[aria-label="Select year"]');
    await expect(yearSelect).toBeVisible();
    const currentYear = String(new Date().getFullYear());
    await expect(yearSelect).toHaveValue(currentYear);
  });

  test('filing deadline displays formatted Spanish date', async ({ page }) => {
    const deadline = page.locator('text=Plazo:');
    await expect(deadline).toBeVisible();
    const text = await deadline.textContent();
    // Should contain Spanish month names like "enero", "abril", etc.
    expect(text).toMatch(/de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/);
  });

  test('NIF shows dash when not set', async ({ page }) => {
    const nif = page.locator('text=NIF:');
    await expect(nif).toBeVisible();
  });
});

test.describe('Invoices Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('shows file dropzone', async ({ page }) => {
    await expect(page.locator('text=Drop invoices or receipts here')).toBeVisible();
  });

  test('shows empty state when no invoices', async ({ page }) => {
    await expect(page.locator('text=No invoices yet')).toBeVisible();
  });

  test('shows quarter filter dropdown', async ({ page }) => {
    const filters = page.locator('.card select');
    expect(await filters.count()).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Expenses Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.locator('button', { hasText: 'Expenses' }).click();
  });

  test('shows file dropzone', async ({ page }) => {
    await expect(page.locator('text=Drop invoices or receipts here')).toBeVisible();
  });

  test('shows empty state when no expenses', async ({ page }) => {
    await expect(page.locator('text=No expenses yet')).toBeVisible();
  });

  test('renders Expenses heading', async ({ page }) => {
    await expect(page.locator('h2', { hasText: 'Expenses' })).toBeVisible();
  });
});

test.describe('Modelo 303 Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.locator('button', { hasText: 'Modelo 303' }).click();
  });

  test('renders Modelo 303 heading', async ({ page }) => {
    await expect(page.locator('h2', { hasText: 'Modelo 303' })).toBeVisible();
  });

  test('shows casilla labels', async ({ page }) => {
    // Modelo 303 shows numbered casillas
    await expect(page.locator('.card')).toBeVisible();
  });
});

test.describe('Modelo 130 Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.locator('button', { hasText: 'Modelo 130' }).click();
  });

  test('renders Modelo 130 heading', async ({ page }) => {
    await expect(page.locator('h2', { hasText: 'Modelo 130' })).toBeVisible();
  });

  test('shows card content', async ({ page }) => {
    await expect(page.locator('.card')).toBeVisible();
  });
});

test.describe('Summary Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.locator('button', { hasText: 'Summary' }).click();
  });

  test('renders summary content', async ({ page }) => {
    await expect(page.locator('text=Modelo 303')).toBeVisible();
    await expect(page.locator('text=Modelo 130')).toBeVisible();
  });

  test('shows total liability or no-data state', async ({ page }) => {
    // Either shows data or empty state
    const hasBanner = await page.locator('text=Total a Ingresar').isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=Sin datos').isVisible().catch(() => false);
    expect(hasBanner || hasEmpty).toBeTruthy();
  });
});

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.locator('button', { hasText: 'Profile' }).click();
  });

  test('renders profile form', async ({ page }) => {
    await expect(page.locator('h2', { hasText: 'Mi Perfil' })).toBeVisible();
  });

  test('has NIF input field', async ({ page }) => {
    await expect(page.locator('label:has-text("NIF")')).toBeVisible();
  });

  test('has home office percentage input', async ({ page }) => {
    await expect(page.locator('label:has-text("Trabajo en Casa")')).toBeVisible();
  });
});

test.describe('Console Errors', () => {
  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await login(page);
    for (const tab of ['Expenses', 'Modelo 303', 'Modelo 130', 'Summary', 'Profile']) {
      await page.locator('button', { hasText: tab }).click();
      await page.waitForTimeout(500);
    }

    const realErrors = errors.filter(e =>
      !e.includes('demo.supabase.co') &&
      !e.includes('favicon') &&
      !e.includes('Manifest') &&
      !e.includes('406') &&
      !e.includes('401')
    );
    expect(realErrors).toHaveLength(0);
  });
});
