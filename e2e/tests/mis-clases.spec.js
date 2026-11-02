const { test, expect } = require('@playwright/test');
const { entrarComo } = require('./helpers');
for (const ancho of [320, 1280]) {
  test('el tutor consulta sus clases a ' + ancho + ' px', async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.addInitScript(
      (oscuro) => localStorage.setItem('kampus.esquema', oscuro ? 'dark' : 'light'),
      ancho === 320,
    );
    await page.emulateMedia({ colorScheme: ancho === 320 ? 'dark' : 'light' });
    await entrarComo(page, 'profe@kampus.test');
    await page.getByText('Seguimiento', { exact: true }).first().click();
    await expect(page.getByText(/^Mis clases$/i)).toBeVisible();
    await expect(page.getByText('DAM 2 A', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear clase' })).toHaveCount(0);
  });
}
