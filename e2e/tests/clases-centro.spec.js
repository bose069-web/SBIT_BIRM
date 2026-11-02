const { test, expect } = require('@playwright/test');
const { entrarComo } = require('./helpers');
for (const ancho of [320, 1280]) {
  test('el instituto gestiona una clase y sus alumnos a ' + ancho + ' px', async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.addInitScript(
      (oscuro) => localStorage.setItem('kampus.esquema', oscuro ? 'dark' : 'light'),
      ancho === 320,
    );
    await page.emulateMedia({ colorScheme: ancho === 320 ? 'dark' : 'light' });
    await entrarComo(page, 'instituto@kampus.test');
    const p = page;
    const btn = (texto) => page.getByRole('button', { name: texto, exact: true }).first();
    const txt = (texto) => page.getByText(texto, { exact: true }).first();
    await btn('Gestionar clases').click();
    await btn('Crear clase').click();
    await p.getByLabel('Ciclo', { exact: true }).fill('QA');
    await p.getByLabel('Curso (1–4)').fill('1');
    await p.getByLabel('Letra', { exact: true }).fill('A');
    await btn('Guardar clase').click();
    await txt('Clase guardada').waitFor();
    await p.getByRole('checkbox').first().click();
    await btn('Asignar a esta clase (1)').click();
    await txt('Asignación guardada').waitFor();
    await p.getByRole('checkbox').first().click();
    await btn('Quitar de esta clase (1)').click();
    await txt('Alumnos retirados de la clase').waitFor();
    await btn('Editar clase').click();
    await p.getByLabel('Letra', { exact: true }).fill('B');
    await btn('Guardar clase').click();
    await p.getByRole('radio', { name: 'QA 1 B' }).waitFor();
    await btn('Borrar clase').click();
    await btn('Confirmar borrado').click();
    await expect(txt('Clase borrada')).toBeVisible();
  });
}
test('la Generalitat gestiona la clase del centro elegido', async ({ page }) => {
  await entrarComo(page, 'generalitat@kampus.test');
  await page.getByRole('button', { name: 'Gestionar clases' }).click();
  await page.getByRole('button', { name: 'Crear clase' }).click();
  await page.getByLabel('Ciclo', { exact: true }).fill('ASIR');
  await page.getByLabel('Curso (1–4)').fill('2');
  await page.getByLabel('Letra', { exact: true }).fill('C');
  await page.getByRole('button', { name: 'Guardar clase' }).click();
  await expect(page.getByRole('radio', { name: 'ASIR 2 C' })).toBeVisible();
});
