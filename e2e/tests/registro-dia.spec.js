const { test, expect } = require('@playwright/test');
const { entrarComo, fechaCortaHoy } = require('./helpers');

test('el alumno registra un día de trabajo con horas por actividad', async ({ page }) => {
  await entrarComo(page, 'alumno@kampus.test');
  await page.getByText('Registrar día', { exact: true }).click();

  await expect(page.getByText('Qué has hecho')).toBeVisible();
  await expect(page.getByText('Sin apuntar')).toBeVisible();

  await page.getByLabel('Desarrollo de interfaces').fill('4');
  await page.getByLabel('Acceso a datos').fill('2');
  await expect(page.getByText('Total del día')).toBeVisible();
  await expect(page.getByText('6 h', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Guardar día' }).click();

  await expect(page.getByText(`Guardado el ${fechaCortaHoy()}`)).toBeVisible();
  await expect(page.getByText('Apuntado')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeVisible();

  await page.getByText('Calendario', { exact: true }).click();
  const diaApuntado = page.getByRole('button', {
    name: `${fechaCortaHoy()}: Trabajo, 6h`,
  });
  await expect(diaApuntado).toBeVisible();
});
