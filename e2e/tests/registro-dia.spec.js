const { test, expect } = require('@playwright/test');
const { entrarComo, fechaCortaHoy, mesEnCurso } = require('./helpers');

test('el alumno registra un día de trabajo con horas por actividad', async ({ page }) => {
  await entrarComo(page, 'alumno@kampus.test');
  await page.getByText('Registrar día', { exact: true }).click();

  await expect(page.getByText('Qué has hecho')).toBeVisible();
  await expect(page.getByText('Sin apuntar')).toBeVisible();

  await page.getByLabel('Desarrollo de interfaces').fill('4');
  await page.getByLabel('Acceso a datos').fill('2');
  await expect(page.getByText('Total del día: 6 h')).toBeVisible();

  await page.getByRole('button', { name: 'Guardar día' }).click();

  await expect(page.getByText(`Guardado el ${fechaCortaHoy()}`)).toBeVisible();
  await expect(page.getByText('Apuntado')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeVisible();

  const listado = page.getByText(`Días de ${mesEnCurso()}`);
  await expect(listado).toBeVisible();
  const diaApuntado = page.getByRole('button', { name: fechaCortaHoy() });
  await expect(diaApuntado).toBeVisible();
  await expect(diaApuntado).toContainText('6 h');
});
