const { test, expect } = require('@playwright/test');
const { entrarComo } = require('./helpers');
for (const ancho of [320, 1280]) {
  test('el tutor confirma y retira su confirmación a ' + ancho + ' px', async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.addInitScript(
      (oscuro) => localStorage.setItem('kampus.esquema', oscuro ? 'dark' : 'light'),
      ancho === 320,
    );
    await page.emulateMedia({ colorScheme: ancho === 320 ? 'dark' : 'light' });
    await entrarComo(page, 'profe@kampus.test');
    await page.getByText('Seguimiento', { exact: true }).first().click();
    await page
      .getByRole('button', { name: /Ver detalle/ })
      .first()
      .click();
    await page
      .getByRole('button', { name: /^Confirmar / })
      .first()
      .click();
    await expect(page.getByText('Mes confirmado', { exact: true })).toBeVisible();
    await page
      .getByRole('button', { name: /^Quitar confirmación de / })
      .first()
      .click();
    await expect(page.getByText('Confirmación retirada')).toBeVisible();
  });
}
test('el instituto consulta el mes sin acciones de tutor', async ({ page }) => {
  await entrarComo(page, 'instituto@kampus.test');
  await page.getByRole('button', { name: 'Gestionar alumnos' }).click();
  await page.getByRole('radio', { name: 'Seguimiento de prácticas' }).click();
  await page
    .getByRole('button', { name: /Alumno Demo.*Ver detalle/ })
    .first()
    .click();
  await expect(page.getByText(/Pendiente de confirmación del tutor/).first()).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^(Confirmar |Quitar confirmación de )/ }),
  ).toHaveCount(0);
});
