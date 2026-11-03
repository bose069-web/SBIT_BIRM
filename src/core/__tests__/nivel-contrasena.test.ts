import { nivelContrasena } from '../domain/perfil';

describe('nivelContrasena', () => {
  it.each([
    ['corta', 0],
    ['kampus2026', 0],
    ['aaaaaaaa', 0],
    ['prueba2026', 1],
    ['Prueba2026', 1],
    ['Prueba-2026', 2],
    ['Prueba-2026-larga', 3],
  ])('%s → %i', (contrasena, nivel) => {
    expect(nivelContrasena(contrasena)).toBe(nivel);
  });
});
