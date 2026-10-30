// Capturas del Inicio del instituto (web ancha y móvil) para revisar los cambios.
// No es un test: se ejecuta con `node capturar-inicio.cjs` desde e2e/ con el server ya arriba.
// El scroll es interno y fullPage no lo sigue: la altura llega hasta la tarjeta de seguimiento.
const { chromium } = require('playwright');
const { entrarComo } = require('./tests/helpers.js');

const BASE = 'http://localhost:8081';

async function capturar(viewport, archivo) {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport, baseURL: BASE });
  page.setDefaultNavigationTimeout(60000);
  await entrarComo(page, 'instituto@kampus.test');
  // El Inicio del instituto: la gestión del centro con su tarjeta de seguimiento.
  await page.getByText('Seguimiento de los alumnos').waitFor({ timeout: 60000 });
  await page.waitForTimeout(2500); // animación de entrada y carga de los avisos
  await page.screenshot({ path: `capturas/${archivo}`, fullPage: true });
  await browser.close();
  console.log(`captura lista: capturas/${archivo}`);
}

(async () => {
  await capturar({ width: 1280, height: 1400 }, 'instituto-web.png');
  await capturar({ width: 390, height: 1900 }, 'instituto-movil.png');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
