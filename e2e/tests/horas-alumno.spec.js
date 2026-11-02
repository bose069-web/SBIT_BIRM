const { test, expect } = require('@playwright/test');
const { entrarComo } = require('./helpers');

async function abrirHoras(page) {
  await page
    .getByRole('button', { name: /Alumno Demo.*Ver detalle/ })
    .first()
    .click();
}

const diasFichados = (page) => page.getByRole('button', { name: /, Fichado, / });

for (const ancho of [320, 1280]) {
  test('el tutor corrige un día del calendario a ' + ancho + ' px', async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    await entrarComo(page, 'profe@kampus.test');
    await page.getByText('Seguimiento', { exact: true }).first().click();
    await abrirHoras(page);

    await diasFichados(page).first().click();
    await page.getByLabel('Observaciones').fill('Corregido a ' + ancho);
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toHaveCount(0);
    await diasFichados(page).first().click();
    await expect(page.getByLabel('Observaciones')).toHaveValue('Corregido a ' + ancho);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
}

test('el tutor borra un día en dos pasos', async ({ page }) => {
  await entrarComo(page, 'profe@kampus.test');
  await page.getByText('Seguimiento', { exact: true }).first().click();
  await abrirHoras(page);
  const dias = diasFichados(page);
  await expect(dias.first()).toBeVisible();
  const antes = await dias.count();
  await dias.first().click();
  await page.getByRole('button', { name: 'Borrar día' }).click();
  await page.getByRole('button', { name: 'Confirmar borrado' }).click();
  await expect(dias).toHaveCount(antes - 1);
});

test('el instituto ve el calendario sin poder corregirlo', async ({ page }) => {
  await entrarComo(page, 'instituto@kampus.test');
  await page.getByRole('button', { name: 'Gestionar alumnos' }).click();
  await page.getByRole('radio', { name: 'Seguimiento de prácticas' }).click();
  await abrirHoras(page);
  await diasFichados(page).first().click();
  await expect(page.getByText(/ · Fichado$/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toHaveCount(0);
});
