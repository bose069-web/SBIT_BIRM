import type { Dossier } from '@/core/domain/dossier';

import {
  conversacionesDe,
  hace,
  horaDe,
  mensajesDe,
  noLeidos,
  porRecientes,
  type MensajeChat,
} from '../chat';

function dossier(cambios: Partial<Dossier> & Pick<Dossier, 'id' | 'alumnoNombre'>): Dossier {
  return {
    alumnoId: `alumno-${cambios.id}`,
    tutorId: 'profe-1',
    tutorNombre: 'Profe Demo',
    tutorEmpresaId: 'empresa-1',
    tutorEmpresaNombre: 'Tutora Demo',
    ciclo: 'DAM',
    centroId: 'centro-1',
    centro: 'Institut Demo',
    empresaId: 'empresa-sl',
    empresa: 'Empresa Demo SL',
    fechaInicio: '2026-09-15',
    fechaFin: '2027-03-15',
    horasTotales: 400,
    actividades: [],
    ...cambios,
  };
}

function mensaje(
  id: string,
  conversacionId: string,
  autorId: string,
  enviadoEn: string,
): MensajeChat {
  return { id, conversacionId, autorId, autorNombre: autorId, texto: `Texto ${id}`, enviadoEn };
}

describe('chat de empresa', () => {
  it('abre un hilo por alumno de la empresa y otro por profe, sin repetirlo', () => {
    const dossiers = [
      dossier({ id: 'd1', alumnoNombre: 'Lucía Ferrer', alumnoId: 'a2' }),
      dossier({ id: 'd2', alumnoNombre: 'Alumno Demo', alumnoId: 'a1' }),
      dossier({
        id: 'd3',
        alumnoNombre: 'Ana Ruiz',
        alumnoId: 'a3',
        tutorId: 'profe-2',
        tutorNombre: 'Profesora Dos',
      }),
      dossier({
        id: 'd4',
        alumnoNombre: 'Otro Alumno',
        alumnoId: 'a4',
        tutorEmpresaId: 'otra-empresa',
      }),
      dossier({
        id: 'd5',
        alumnoNombre: 'Sin Profe',
        alumnoId: 'a5',
        tutorId: null,
        tutorNombre: null,
      }),
    ];

    const conversaciones = conversacionesDe(dossiers, 'empresa-1');

    expect(conversaciones.map((c) => c.id)).toEqual([
      'alumno:a1',
      'alumno:a3',
      'alumno:a2',
      'alumno:a5',
      'profe:profe-1',
      'profe:profe-2',
    ]);
    // Solo la etiqueta del alumno lleva ciclo y centro; la del profe, a quién sigue.
    expect(conversaciones[0]).toMatchObject({
      titulo: 'Alumno Demo',
      etiqueta: 'DAM · Institut Demo',
      rol: 'alumno',
    });
    expect(conversaciones[4]).toMatchObject({
      titulo: 'Profe Demo',
      etiqueta: 'Profe de Alumno Demo, Lucía Ferrer',
      rol: 'profe',
    });
  });

  it('ordena la bandeja por el último mensaje y deja al final los hilos vacíos', () => {
    const conversaciones = conversacionesDe(
      [
        dossier({ id: 'd1', alumnoNombre: 'Alumno Demo', alumnoId: 'a1' }),
        dossier({ id: 'd2', alumnoNombre: 'Lucía Ferrer', alumnoId: 'a2' }),
        dossier({ id: 'd3', alumnoNombre: 'Ana Ruiz', alumnoId: 'a3' }),
      ],
      'empresa-1',
    );
    const mensajes = [
      mensaje('m1', 'alumno:a1', 'a1', '2026-10-27T09:00:00.000Z'),
      mensaje('m2', 'alumno:a1', 'empresa-1', '2026-10-27T10:00:00.000Z'),
      mensaje('m3', 'alumno:a2', 'a2', '2026-10-28T08:00:00.000Z'),
    ];

    expect(porRecientes(conversaciones, mensajes).map((c) => c.id)).toEqual([
      'alumno:a2',
      'alumno:a1',
      'alumno:a3',
      'profe:profe-1',
    ]);
  });

  it('deja los mensajes del hilo del más antiguo al más reciente', () => {
    const mensajes = [
      mensaje('m2', 'alumno:a1', 'empresa-1', '2026-10-27T10:00:00.000Z'),
      mensaje('m1', 'alumno:a1', 'a1', '2026-10-27T09:00:00.000Z'),
      mensaje('m3', 'alumno:a2', 'a2', '2026-10-27T11:00:00.000Z'),
    ];

    expect(mensajesDe(mensajes, 'alumno:a1').map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('no cuenta como no leídos ni los míos ni los de antes de abrir el hilo', () => {
    const mensajes = [
      mensaje('m1', 'alumno:a1', 'a1', '2026-10-27T09:00:00.000Z'),
      mensaje('m2', 'alumno:a1', 'a1', '2026-10-27T10:00:00.000Z'),
      mensaje('m3', 'alumno:a1', 'empresa-1', '2026-10-27T11:00:00.000Z'),
    ];

    expect(noLeidos(mensajes, 'alumno:a1', null, 'empresa-1')).toBe(2);
    expect(noLeidos(mensajes, 'alumno:a1', '2026-10-27T09:30:00.000Z', 'empresa-1')).toBe(1);
    expect(noLeidos(mensajes, 'alumno:a1', '2026-10-27T12:00:00.000Z', 'empresa-1')).toBe(0);
  });

  it('escribe los tiempos del chat en corto', () => {
    const ahora = new Date('2026-10-29T12:00:00.000Z');

    expect(hace('2026-10-29T11:30:00.000Z', ahora)).toBe('hace 30 min');
    expect(hace('2026-10-29T09:00:00.000Z', ahora)).toBe('hace 3 h');
    expect(hace('2026-10-28T11:00:00.000Z', ahora)).toBe('ayer');
    expect(hace('2026-10-26T11:00:00.000Z', ahora)).toBe('hace 3 días');
    expect(hace('2026-10-01T11:00:00.000Z', ahora)).toBe('1 oct 2026');
    expect(horaDe('2026-10-27T14:05:00.000Z')).toMatch(/^\d{2}:\d{2}$/);
  });
});
