import { obtenerDossierActual } from '../application/dossier';
import { estaEnPeriodo } from '../domain/dossier';
import { crearDossier, DossiersFalsos } from '../__fixtures__/datos';

describe('dossier', () => {
  it('sabe si una fecha está dentro de las prácticas (límites incluidos)', () => {
    const d = crearDossier();
    expect(estaEnPeriodo(d, '2026-09-15')).toBe(true);
    expect(estaEnPeriodo(d, '2027-03-15')).toBe(true);
    expect(estaEnPeriodo(d, '2027-03-16')).toBe(false);
  });

  it('el dossier actual es el que incluye hoy o, si no, el más reciente', async () => {
    const antiguo = crearDossier({
      id: 'viejo',
      fechaInicio: '2025-01-10',
      fechaFin: '2025-06-10',
    });
    const actual = crearDossier({ id: 'actual' });
    const puerto = new DossiersFalsos();
    puerto.dossiers = [antiguo, actual];
    expect((await obtenerDossierActual(puerto, '2026-10-27'))?.id).toBe('actual');
    expect((await obtenerDossierActual(puerto, '2028-01-01'))?.id).toBe('actual');
    const vacio = new DossiersFalsos();
    expect(await obtenerDossierActual(vacio, '2026-10-27')).toBeNull();
  });
});
