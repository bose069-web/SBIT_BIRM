import { crearDossier } from '@/core/__fixtures__/datos';
import type { RegistroDiario } from '@/core/domain/registro-diario';

import { calcularProgreso } from '../progreso';

const dia = (fecha: string, horas: number): RegistroDiario => ({
  id: fecha,
  dossierId: 'd1',
  fecha,
  tipo: 'trabajo',
  horas: [{ actividadId: 'act1', horas }],
  observaciones: null,
});

describe('calcularProgreso', () => {
  // Periodo de lunes 5 a viernes 30 de octubre; hoy es miércoles 7.
  const dossier = crearDossier({
    fechaInicio: '2026-10-05',
    fechaFin: '2026-10-30',
    horasTotales: 40,
  });

  it('cuenta lo que queda, la semana y los días sin apuntar', () => {
    const p = calcularProgreso(dossier, [dia('2026-10-05', 8)], '2026-10-07');
    expect(p.quedan).toBe(32);
    expect(p.horasSemana).toBe(8);
    expect(p.sinApuntar).toEqual(['2026-10-06', '2026-10-07']);
  });

  it('estima el fin al ritmo actual saltando fines de semana', () => {
    const p = calcularProgreso(dossier, [dia('2026-10-05', 8)], '2026-10-07');
    // Faltan 32 h a 8 h/día: jueves 8, viernes 9, lunes 12 y martes 13.
    expect(p.finEstimado).toBe('2026-10-13');
    expect(p.aTiempo).toBe(true);
  });

  it('sin horas todavía no hay ritmo', () => {
    const p = calcularProgreso(dossier, [], '2026-10-07');
    expect(p.finEstimado).toBeNull();
    expect(p.aTiempo).toBe(false);
  });
});
