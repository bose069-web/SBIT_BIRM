const { test, expect } = require('@playwright/test');
const { entrarComo } = require('./helpers');
for (const ancho of [320, 1280]) {
  test('el alumno abre Registro desde su aviso a ' + ancho + ' px', async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.addInitScript(
      (oscuro) => localStorage.setItem('kampus.esquema', oscuro ? 'dark' : 'light'),
      ancho === 320,
    );
    await page.emulateMedia({ colorScheme: ancho === 320 ? 'dark' : 'light' });
    await entrarComo(page, 'alumno@kampus.test');
    await expect(page.getByText(/Tu tutor te ha dado un toque/)).toBeVisible();
    await page.getByRole('button', { name: 'Apuntar ahora', exact: true }).click();
    await expect(page).toHaveURL(/\/registro$/);
  });
}
