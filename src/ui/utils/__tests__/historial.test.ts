import { crearDossier } from '@/core/__fixtures__/datos';
import type { EntradaHistorial } from '@/core/domain/historial';

import { autorEntrada, textoEntrada } from '../historial';

const entrada = (cambios: Partial<EntradaHistorial>): EntradaHistorial => ({
  id: '1',
  dossierId: 'd1',
  entidad: 'dossier',
  accion: 'crear',
  actorId: null,
  actorRol: null,
  detalle: {},
  ocurridoEn: '2026-10-30T10:00:00Z',
  ...cambios,
});

describe('textoEntrada', () => {
  it('cuenta qué ha pasado con cada entidad', () => {
    expect(textoEntrada(entrada({ accion: 'editar' }))).toBe('Dossier editado');
    expect(
      textoEntrada(entrada({ entidad: 'valoracion_final', detalle: { resultado: 'no_apto' } })),
    ).toBe('Valoración final puesta: no apto');
    expect(
      textoEntrada(
        entrada({
          entidad: 'valoracion_mensual',
          detalle: { mes: '2026-10', valoracion: 'negativa' },
        }),
      ),
    ).toMatch(/^Valoración de .*octubre.* puesta: negativa$/i);
    expect(textoEntrada(entrada({ entidad: 'registro', accion: 'borrar', detalle: {} }))).toBe(
      'Día borrado',
    );
  });
});

describe('autorEntrada', () => {
  const dossier = crearDossier({
    alumnoId: 'a',
    alumnoNombre: 'Ana',
    tutorId: 'p',
    tutorNombre: 'Pere',
    tutorEmpresaId: 'e',
    tutorEmpresaNombre: 'Eva',
  });

  it('usa los nombres del dossier, "Tú" y, si no, solo el papel', () => {
    expect(autorEntrada({ actorId: 'a', actorRol: 'alumno' }, dossier, 'a')).toBe('Tú');
    expect(autorEntrada({ actorId: 'e', actorRol: 'empresa' }, dossier, 'a')).toBe('Eva');
    expect(autorEntrada({ actorId: 'x', actorRol: 'instituto' }, dossier, 'a')).toBe('Instituto');
    expect(autorEntrada({ actorId: null, actorRol: null }, dossier, 'a')).toBe('Sistema');
  });
});
