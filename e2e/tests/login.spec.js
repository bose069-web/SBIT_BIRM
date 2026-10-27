const { test, expect } = require('@playwright/test');
const { entrarComo } = require('./helpers');

test('rechaza las credenciales incorrectas', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Correo').fill('alumno@kampus.test');
  await page.getByLabel('Contraseña').fill('no-es-la-clave');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByText('Email o contraseña incorrectos')).toBeVisible();
});

test('el alumno entra y ve su panel', async ({ page }) => {
  await entrarComo(page, 'alumno@kampus.test');

  await expect(page.getByText('Hola, Alumno')).toBeVisible();
  await expect(page.getByText('Horas de prácticas')).toBeVisible();
  await expect(page.getByText('Registrar día', { exact: true })).toBeVisible();
});
