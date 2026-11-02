const { test, expect } = require('@playwright/test');
const { entrarComo } = require('./helpers');
for (const ancho of [320, 1280]) {
  test('el profe recibe aviso si repite un toque a ' + ancho + ' px', async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.addInitScript(
      (oscuro) => localStorage.setItem('kampus.esquema', oscuro ? 'dark' : 'light'),
      ancho === 320,
    );
    await page.emulateMedia({ colorScheme: ancho === 320 ? 'dark' : 'light' });
    await entrarComo(page, 'profe@kampus.test');
    await page.clock.setFixedTime(new Date('2026-11-02T12:00:00Z'));
    const dar = page.getByRole('button', { name: 'Darle un toque' }).first();
    await dar.click();
    await expect(page.getByText(/verá el aviso en Inicio/)).toBeVisible();
    await dar.click();
    await expect(page.getByText('Ya has dado un toque a este alumno hoy.')).toBeVisible();
  });
}
