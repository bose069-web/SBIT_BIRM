const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Contraseña de todas las cuentas demo. */
const CONTRASENA = 'kampus';

/** Entra con el formulario de login (sin usar los botones de prueba, que solo existen en __DEV__). */
async function entrarComo(page, email) {
  await page.goto('/');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(CONTRASENA);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

/** Réplica de `fechaCorta` de la app: `2026-10-27` → `27 oct 2026`. */
function fechaCortaHoy() {
  const d = new Date();
  return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

/** Réplica de `nombreMes` de la app: mes en curso en minúsculas (`octubre 2026`). */
function mesEnCurso() {
  const d = new Date();
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

module.exports = { CONTRASENA, entrarComo, fechaCortaHoy, mesEnCurso };
