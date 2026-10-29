import type { Dossier } from '@/core/domain/dossier';

import {
  conversacionesDe,
  conversacionesDelAlumno,
  conversacionesDelProfesor,
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

    expect(conversaciones.map((c) => c.id)).toEqual(['a1', 'a3', 'a2', 'a5', 'profe-1', 'profe-2']);
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
      mensaje('m1', 'a1', 'a1', '2026-10-27T09:00:00.000Z'),
      mensaje('m2', 'a1', 'empresa-1', '2026-10-27T10:00:00.000Z'),
      mensaje('m3', 'a2', 'a2', '2026-10-28T08:00:00.000Z'),
    ];

    expect(porRecientes(conversaciones, mensajes).map((c) => c.id)).toEqual([
      'a2',
      'a1',
      'a3',
      'profe-1',
    ]);
  });

  it('deja los mensajes del hilo del más antiguo al más reciente', () => {
    const mensajes = [
      mensaje('m2', 'a1', 'empresa-1', '2026-10-27T10:00:00.000Z'),
      mensaje('m1', 'a1', 'a1', '2026-10-27T09:00:00.000Z'),
      mensaje('m3', 'a2', 'a2', '2026-10-27T11:00:00.000Z'),
    ];

    expect(mensajesDe(mensajes, 'a1').map((m) => m.id)).toEqual(['m1', 'm2']);
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

describe('contactos directos del alumno', () => {
  it('ofrece su tutor de empresa y su profe con el id de cada persona', () => {
    const contactos = conversacionesDelAlumno(
      [
        dossier({ id: 'd1', alumnoNombre: 'Ana', alumnoId: 'a1' }),
        dossier({
          id: 'd2',
          alumnoNombre: 'Otro',
          alumnoId: 'a2',
          tutorId: 'profe-ajeno',
          tutorEmpresaId: 'empresa-ajena',
        }),
      ],
      'a1',
    );

    expect(contactos).toEqual([
      { id: 'empresa-1', titulo: 'Tutora Demo', rol: 'empresa', etiqueta: 'DAM · Empresa Demo SL' },
      { id: 'profe-1', titulo: 'Profe Demo', rol: 'profe', etiqueta: 'DAM · Institut Demo' },
    ]);
  });

  it('agrupa tutores repetidos y toma el dossier más reciente sin modificar la entrada', () => {
    const antiguo = dossier({
      id: 'd1',
      alumnoNombre: 'Ana',
      alumnoId: 'a1',
      ciclo: 'ASIX',
      fechaInicio: '2025-09-15',
    });
    const reciente = dossier({ id: 'd2', alumnoNombre: 'Ana', alumnoId: 'a1', ciclo: 'DAM' });
    const entrada = [antiguo, reciente];
    const contactos = conversacionesDelAlumno(entrada, 'a1');

    expect(contactos).toHaveLength(2);
    expect(contactos.map((c) => c.etiqueta)).toEqual([
      'DAM · Empresa Demo SL',
      'DAM · Institut Demo',
    ]);
    expect(entrada).toEqual([antiguo, reciente]);
  });

  it('mantiene los distintos tutores de todos los dossiers del alumno', () => {
    const contactos = conversacionesDelAlumno(
      [
        dossier({ id: 'd1', alumnoNombre: 'Ana', alumnoId: 'a1' }),
        dossier({
          id: 'd2',
          alumnoNombre: 'Ana',
          alumnoId: 'a1',
          tutorEmpresaId: 'empresa-2',
          tutorEmpresaNombre: 'Otro tutor',
          tutorId: 'profe-2',
          tutorNombre: 'Otra profe',
        }),
      ],
      'a1',
    );

    expect(contactos.map((c) => c.id)).toEqual(['empresa-1', 'profe-1', 'empresa-2', 'profe-2']);
  });

  it('omite tutores sin asignar y evita una conversación consigo mismo', () => {
    const contactos = conversacionesDelAlumno(
      [
        dossier({
          id: 'd1',
          alumnoNombre: 'Ana',
          alumnoId: 'a1',
          tutorId: null,
          tutorNombre: null,
          tutorEmpresaId: null,
          tutorEmpresaNombre: null,
        }),
        dossier({
          id: 'd2',
          alumnoNombre: 'Ana',
          alumnoId: 'a1',
          tutorId: 'a1',
          tutorEmpresaId: null,
        }),
      ],
      'a1',
    );

    expect(contactos).toEqual([]);
    expect(conversacionesDelAlumno([], 'a1')).toEqual([]);
  });

  it('permite contactar con un tutor asignado aunque su nombre o entidad no estén disponibles', () => {
    const contactos = conversacionesDelAlumno(
      [
        dossier({
          id: 'd1',
          alumnoNombre: 'Ana',
          alumnoId: 'a1',
          tutorNombre: null,
          tutorEmpresaNombre: ' ',
          centro: null,
          empresa: null,
        }),
      ],
      'a1',
    );

    expect(contactos).toEqual([
      { id: 'empresa-1', titulo: 'Tutor de empresa', rol: 'empresa', etiqueta: 'DAM' },
      { id: 'profe-1', titulo: 'Profe del centro', rol: 'profe', etiqueta: 'DAM' },
    ]);
  });
});

describe('contactos del profesor', () => {
  it('incluye alumnos y empresas asignados, sin duplicar ni mostrar dossiers ajenos', () => {
    const propios = [
      dossier({ id: '1', alumnoNombre: 'Uno' }),
      dossier({ id: '2', alumnoNombre: 'Dos' }),
    ];
    const ajeno = dossier({ id: '3', alumnoNombre: 'Ajeno', tutorId: 'otro' });
    expect(conversacionesDelProfesor([...propios, ajeno], 'profe-1').map((c) => c.id)).toEqual([
      'alumno-1',
      'empresa-1',
      'alumno-2',
    ]);
  });
});
