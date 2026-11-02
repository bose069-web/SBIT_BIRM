const { test, expect } = require('@playwright/test');
const { entrarComo } = require('./helpers');

async function abrirHoras(page) {
  await page
    .getByRole('button', { name: /Alumno Demo.*Ver detalle/ })
    .first()
    .click();
  await page.getByRole('button', { name: /^Horas fichadas de / }).click();
}

for (const ancho of [320, 1280]) {
  test('el tutor corrige un día a ' + ancho + ' px', async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    await entrarComo(page, 'profe@kampus.test');
    await page.getByText('Seguimiento', { exact: true }).first().click();
    await abrirHoras(page);
    const dia = page.getByRole('button', { name: /\. Corregir$/ }).first();
    await dia.click();
    await page.getByLabel('Observaciones').fill('Corregido a ' + ancho);
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByText('Corregido a ' + ancho)).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
}

test('el tutor borra un día en dos pasos', async ({ page }) => {
  await entrarComo(page, 'profe@kampus.test');
  await page.getByText('Seguimiento', { exact: true }).first().click();
  await abrirHoras(page);
  const dias = page.getByRole('button', { name: /\. Corregir$/ });
  await expect(dias.first()).toBeVisible();
  const antes = await dias.count();
  await dias.first().click();
  await page.getByRole('button', { name: 'Borrar día' }).click();
  await page.getByRole('button', { name: 'Confirmar borrado' }).click();
  await expect(dias).toHaveCount(antes - 1);
});

test('el instituto ve las horas sin poder corregirlas', async ({ page }) => {
  await entrarComo(page, 'instituto@kampus.test');
  await page.getByRole('button', { name: 'Gestionar alumnos' }).click();
  await page.getByRole('radio', { name: 'Seguimiento de prácticas' }).click();
  await abrirHoras(page);
  await expect(page.getByRole('button', { name: /^Horas fichadas de / })).toBeVisible();
  await expect(page.getByText(/Fichado|h$/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /\. Corregir$/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Añadir día' })).toHaveCount(0);
});
