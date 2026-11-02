const { test, expect } = require('@playwright/test');
const { entrarComo } = require('./helpers');

test('se puede pedir la recuperación desde el inicio de sesión', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '¿Has olvidado tu contraseña?' }).click();
  await page.getByLabel('Correo').fill('alumno@kampus.test');
  await page.getByRole('button', { name: 'Pedir recuperación' }).click();
  await expect(page.getByText(/Solicitud enviada/)).toBeVisible();
});

test('un enlace inválido no deja cambiar la contraseña', async ({ page }) => {
  await page.goto('/restablecer');
  await expect(page.getByText(/enlace no es válido/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar contraseña' })).toHaveCount(0);
});

test('el profe tiene siempre el apartado de contraseñas', async ({ page }) => {
  await entrarComo(page, 'profe@kampus.test');
  await page.getByText('Seguimiento', { exact: true }).first().click();
  await expect(page.getByText('RESTABLECER CONTRASEÑA', { exact: true })).toBeVisible();
});
