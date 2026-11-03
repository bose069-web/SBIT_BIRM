const { test, expect } = require('@playwright/test');
const { entrarComo } = require('./helpers');

test('la apariencia se elige en el perfil y se recuerda', async ({ page }) => {
  await entrarComo(page, 'alumno@kampus.test');
  await page.getByRole('tab', { name: 'Perfil' }).click();
  await page.getByRole('radio', { name: 'Oscuro' }).click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.style.colorScheme))
    .toBe('dark');
  expect(await page.evaluate(() => localStorage.getItem('kampus.esquema'))).toBe('dark');
});
