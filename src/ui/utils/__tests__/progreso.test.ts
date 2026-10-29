import { crearDossier } from '@/core/__fixtures__/datos';
import type { RegistroDiario } from '@/core/domain/registro-diario';

import {
  calcularProgreso,
  horasPorActividad,
  nivelSinApuntar,
  pasosDelMes,
  semanaDePracticas,
  ultimosRegistros,
} from '../progreso';

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

describe('nivelSinApuntar', () => {
  it('sube de nivel a los 1, 8 y 16 días', () => {
    expect(nivelSinApuntar(0)).toBe('ninguno');
    expect(nivelSinApuntar(1)).toBe('leve');
    expect(nivelSinApuntar(7)).toBe('leve');
    expect(nivelSinApuntar(8)).toBe('medio');
    expect(nivelSinApuntar(15)).toBe('medio');
    expect(nivelSinApuntar(16)).toBe('grave');
  });
});

describe('datos del Inicio', () => {
  it('semana de prácticas: la primera, una a mitad y nunca más que el total', () => {
    const periodo = { fechaInicio: '2026-09-15', fechaFin: '2026-10-12' };
    expect(semanaDePracticas(periodo, '2026-09-15')).toEqual({ actual: 1, total: 4 });
    expect(semanaDePracticas(periodo, '2026-09-29')).toEqual({ actual: 3, total: 4 });
    expect(semanaDePracticas(periodo, '2026-12-01')).toEqual({ actual: 4, total: 4 });
  });

  it('horas del mes por actividad, en el orden del dossier y con ceros', () => {
    const dossier = {
      actividades: [
        { id: 'b', descripcion: 'Pruebas', orden: 2 },
        { id: 'a', descripcion: 'Interfaces', orden: 1 },
      ],
    };
    const registros: RegistroDiario[] = [
      { ...dia('2026-10-01', 0), horas: [{ actividadId: 'a', horas: 4 }] },
      { ...dia('2026-10-02', 0), horas: [{ actividadId: 'a', horas: 2 }] },
      { ...dia('2026-09-30', 0), horas: [{ actividadId: 'b', horas: 6 }] },
    ];
    expect(horasPorActividad(dossier, registros, '2026-10')).toEqual([
      { id: 'a', descripcion: 'Interfaces', horas: 6 },
      { id: 'b', descripcion: 'Pruebas', horas: 0 },
    ]);
  });

  it('últimos registros, del más reciente al más antiguo', () => {
    const r = [dia('2026-10-01', 1), dia('2026-10-03', 1), dia('2026-10-02', 1)];
    expect(ultimosRegistros(r, 2).map((x) => x.fecha)).toEqual(['2026-10-03', '2026-10-02']);
  });

  it('pasos del mes: sin validar lo lleva el alumno; validado espera al profe', () => {
    expect(pasosDelMes('2026-10', ['2026-09'])).toEqual({
      alumno: 'actual',
      empresa: 'pendiente',
      profe: 'pendiente',
    });
    expect(pasosDelMes('2026-09', ['2026-09'])).toEqual({
      alumno: 'hecho',
      empresa: 'hecho',
      profe: 'actual',
    });
  });
});
