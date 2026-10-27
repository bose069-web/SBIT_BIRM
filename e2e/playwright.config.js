const os = require('os');
const path = require('path');
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  // Metro compila rutas al vuelo y a veces tarda >30 s; sin margen los tests fallan por tiempo.
  timeout: 120000,
  expect: { timeout: 45000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  // Fuera del repo: Metro vigila la raíz y los archivos del runner invalidan su caché.
  outputDir: path.join(os.tmpdir(), 'kampus-e2e-results'),
  use: {
    // Edge del sistema: evita descargar Chromium (descarga lenta en este entorno).
    channel: 'msedge',
    baseURL: 'http://localhost:8081',
    navigationTimeout: 60000,
    actionTimeout: 45000,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run start:app',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
    stdout: 'ignore',
  },
});
