import type { Seguimiento } from '@/core/application/valoracion';
import { crearDossier } from '@/core/__fixtures__/datos';
import type { Dossier } from '@/core/domain/dossier';
import type { ValoracionMensual } from '@/core/domain/valoracion';

import { informesPorValidar, mesesPorValidar, valoracionesConAlumno } from '../validaciones';

const HOY = '2026-12-10';

const valoracion = (mes: string, cambios: Partial<ValoracionMensual> = {}): ValoracionMensual => ({
  id: `v-${mes}`,
  dossierId: 'd1',
  mes,
  valoracion: 'positiva',
  comentario: null,
  valoradaPor: 'e1',
  valoradaEn: '2026-11-02T10:00:00.000Z',
  ...cambios,
});

const seguimiento = (mensuales: ValoracionMensual[] = []): Seguimiento => ({
  mensuales,
  final: null,
  sinValorar: [],
});

const seguimientoCerrado = (): Seguimiento => ({
  mensuales: [],
  final: {
    dossierId: 'd1',
    resultado: 'apto',
    comentario: null,
    valoradaPor: 'p1',
    valoradaEn: '2027-03-20T09:00:00.000Z',
  },
  sinValorar: [],
});

describe('mesesPorValidar', () => {
  it('cuenta los meses empezados, también el mes en curso, y quita los ya valorados', () => {
    const dossier = crearDossier();
    expect(mesesPorValidar(dossier, seguimiento([valoracion('2026-10')]), HOY)).toEqual([
      '2026-09',
      '2026-11',
      '2026-12',
    ]);
  });

  it('no pide nada antes de que empiecen las prácticas', () => {
    expect(mesesPorValidar(crearDossier(), seguimiento(), '2026-08-20')).toEqual([]);
  });

  it('la valoración final del profe cierra el dossier: ya no hay meses que validar', () => {
    expect(mesesPorValidar(crearDossier(), seguimientoCerrado(), HOY)).toEqual([]);
  });
});

describe('informesPorValidar', () => {
  it('junta los pendientes de todos, del mes más reciente al más antiguo', () => {
    const ana: Dossier = crearDossier();
    const biel: Dossier = crearDossier({ id: 'd2', alumnoNombre: 'Biel' });
    const informes = informesPorValidar(
      [
        { dossier: biel, seguimiento: seguimiento([valoracion('2026-11')]) },
        { dossier: ana, seguimiento: seguimiento([valoracion('2026-12')]) },
      ],
      HOY,
    );
    expect(informes.map((i) => `${i.dossier.alumnoNombre} ${i.mes}`)).toEqual([
      'Biel 2026-12',
      'Ana 2026-11',
      'Ana 2026-10',
      'Biel 2026-10',
      'Ana 2026-09',
      'Biel 2026-09',
    ]);
  });
});

describe('valoracionesConAlumno', () => {
  it('pone primero la última que se ha validado', () => {
    const dossier = crearDossier();
    const cargas = [
      {
        dossier,
        seguimiento: seguimiento([
          valoracion('2026-09', { valoradaEn: '2026-10-01T09:00:00.000Z' }),
          valoracion('2026-10', { valoradaEn: '2026-11-03T09:00:00.000Z' }),
        ]),
      },
    ];
    expect(valoracionesConAlumno(cargas).map((v) => v.valoracion.mes)).toEqual([
      '2026-10',
      '2026-09',
    ]);
  });
});
