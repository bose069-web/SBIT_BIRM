const { test, expect } = require('@playwright/test');
const { entrarComo } = require('./helpers');
for (const ancho of [320, 1280]) {
  test('el instituto revisa y confirma un reparto a ' + ancho + ' px', async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.addInitScript(
      (oscuro) => localStorage.setItem('kampus.esquema', oscuro ? 'dark' : 'light'),
      ancho === 320,
    );
    await page.emulateMedia({ colorScheme: ancho === 320 ? 'dark' : 'light' });
    await entrarComo(page, 'instituto@kampus.test');
    await page.getByRole('button', { name: 'Gestionar alumnos' }).click();
    await page.getByRole('radio', { name: 'Reparto por profesor' }).click();
    const casillas = page.getByRole('checkbox');
    await casillas.first().click();
    await casillas.nth(1).click();
    await page.getByRole('radio', { name: 'Laia Puig', exact: true }).click();
    await page.getByRole('button', { name: 'Revisar reasignación (2)' }).click();
    await page.getByRole('button', { name: 'Volver a la selección' }).click();
    await page.getByRole('button', { name: 'Revisar reasignación (2)' }).click();
    await page.getByRole('button', { name: 'Confirmar reasignación' }).click();
    await expect(page.getByText('Reasignación completada. Alumnos actualizados: 2.')).toBeVisible();
  });
}
