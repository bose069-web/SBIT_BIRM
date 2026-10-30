import { crearDossier } from '@/core/__fixtures__/datos';
import type { ValoracionFinal, ValoracionMensual } from '@/core/domain/valoracion';

import {
  organizarPendientes,
  pendientesAlumno,
  pendientesCentro,
  pendientesEmpresa,
  pendientesProfe,
  type DatosPendientesAlumno,
} from '../pendientes';

const HOY = '2026-12-10';

const incidencia = (id: string, estado: 'abierta' | 'en_curso' | 'resuelta' = 'abierta') => ({
  id,
  titulo: `Incidencia ${id}`,
  estado,
  creadaPorNombre: 'Ana',
});

const alumno = (cambios: Partial<DatosPendientesAlumno> = {}): DatosPendientesAlumno => ({
  hoy: HOY,
  sinApuntar: [],
  seguimiento: { mensuales: [], final: null },
  tareas: [],
  incidencias: [],
  ...cambios,
});

describe('pendientesAlumno', () => {
  it('sin nada pendiente devuelve una lista vacía', () => {
    expect(pendientesAlumno(alumno())).toEqual([]);
  });

  it('separa el día de hoy de los anteriores y lleva a la fecha concreta', () => {
    const [deHoy, atrasados] = pendientesAlumno(
      alumno({ sinApuntar: ['2026-12-07', '2026-12-08', HOY] }),
    );
    expect(deHoy.destino).toEqual({ pathname: '/registro', params: { fecha: HOY } });
    expect(atrasados.titulo).toBe('2 días sin apuntar');
    expect(atrasados.destino).toEqual({ pathname: '/registro', params: { fecha: '2026-12-07' } });
  });

  it('no avisa de días de un mes ya valorado, que no se pueden apuntar', () => {
    const mensual = { mes: '2026-11' } as ValoracionMensual;
    const lista = pendientesAlumno(
      alumno({ sinApuntar: ['2026-11-30'], seguimiento: { mensuales: [mensual], final: null } }),
    );
    expect(lista).toEqual([]);
  });

  it('con la valoración final no queda ningún día por apuntar', () => {
    const lista = pendientesAlumno(
      alumno({
        sinApuntar: [HOY],
        seguimiento: { mensuales: [], final: {} as ValoracionFinal },
      }),
    );
    expect(lista).toEqual([]);
  });

  it('cuenta las tareas sin hacer y resalta las vencidas', () => {
    const [tareas] = pendientesAlumno(
      alumno({
        tareas: [
          { titulo: 'Vieja', completada: false, fechaLimite: '2026-12-01' },
          { titulo: 'Nueva', completada: false, fechaLimite: null },
          { titulo: 'Hecha', completada: true, fechaLimite: '2026-12-01' },
        ],
      }),
    );
    expect(tareas.titulo).toBe('2 tareas pendientes');
    expect(tareas.etiqueta).toBe('1 vencida');
    expect(tareas.destino).toEqual({ seccion: 'tareas' });
  });

  it('solo cuenta incidencias sin resolver y son secundarias: las atiende otro', () => {
    const lista = pendientesAlumno(
      alumno({ incidencias: [incidencia('a'), incidencia('b', 'resuelta')] }),
    );
    expect(lista.map((p) => p.destino)).toEqual([
      { pathname: '/chat', params: { incidencia: 'a' } },
    ]);
    expect(lista[0].prioridad).toBe('secundario');
  });

  it('registrar y hacer tareas son obligaciones', () => {
    const lista = pendientesAlumno(
      alumno({
        sinApuntar: ['2026-12-07', HOY],
        tareas: [{ titulo: 'T', completada: false, fechaLimite: null }],
      }),
    );
    expect(lista.map((p) => p.prioridad)).toEqual(['importante', 'importante', 'importante']);
  });

  it('tolera que tareas e incidencias no se hayan podido cargar', () => {
    expect(pendientesAlumno(alumno({ tareas: null, incidencias: null }))).toEqual([]);
  });
});

describe('pendientesEmpresa', () => {
  it('un solo informe abre la valoración de ese mes', () => {
    const dossier = crearDossier({ id: 'd1' });
    const [informe] = pendientesEmpresa([{ dossier, mes: '2026-11' }]);
    expect(informe.accion).toBe('Valorar');
    expect(informe.destino).toEqual({ pathname: '/', params: { valorar: 'd1', mes: '2026-11' } });
    expect(informe.prioridad).toBe('importante');
  });

  it('agrupa los informes de cada alumno en un aviso', () => {
    const d1 = crearDossier({ id: 'd1' });
    const d2 = crearDossier({ id: 'd2' });
    const lista = pendientesEmpresa([
      { dossier: d1, mes: '2026-11' },
      { dossier: d2, mes: '2026-11' },
      { dossier: d1, mes: '2026-10' },
    ]);
    expect(lista.map((p) => p.id)).toEqual(['informes-d1', 'informes-d2']);
    expect(lista[0].detalle).toMatch(/^2 informes/);
    expect(lista[0].destino).toEqual({ pathname: '/', params: { valorar: 'd1' } });
  });
});

describe('pendientesProfe', () => {
  it('junta lo de un mismo alumno en un aviso secundario que abre su ficha', () => {
    const lista = pendientesProfe({
      incidencias: [incidencia('a'), incidencia('b', 'resuelta')],
      sinApuntar: [{ dossierId: 'd1', nombre: 'Ana', dias: 4, ultimo: null }],
      faltaValorar: [
        { dossierId: 'd1', nombre: 'Ana', empresa: 'ACME', meses: ['2026-11'] },
        { dossierId: 'd2', nombre: 'Luis', empresa: null, meses: ['2026-11'] },
      ],
    });
    expect(lista.map((p) => p.id)).toEqual(['incidencias', 'alumno-d1', 'alumno-d2']);
    expect(lista.map((p) => p.prioridad)).toEqual(['importante', 'secundario', 'secundario']);
    expect(lista[1].detalle).toContain('4 días');
    expect(lista[1].detalle).toContain('ACME');
    expect(lista[1].destino).toEqual({ pathname: '/', params: { dossier: 'd1' } });
  });

  it('varias incidencias se juntan y llevan al chat', () => {
    const [aviso] = pendientesProfe({
      incidencias: [incidencia('a'), incidencia('b')],
      sinApuntar: [],
      faltaValorar: [],
    });
    expect(aviso.titulo).toBe('2 incidencias abiertas');
    expect(aviso.destino).toEqual({ pathname: '/chat' });
  });
});

describe('organizarPendientes', () => {
  const aviso = (id: string, prioridad: 'importante' | 'secundario') => ({
    id,
    titulo: id,
    detalle: '',
    accion: 'Ir',
    destino: { pathname: '/' as const },
    prioridad,
  });
  const lista = [aviso('a', 'importante'), aviso('b', 'secundario'), aviso('a', 'importante')];

  it('quita duplicados y separa importante de secundario', () => {
    const r = organizarPendientes(lista, false);
    expect(r.importantes.map((p) => p.id)).toEqual(['a']);
    expect(r.secundarios.map((p) => p.id)).toEqual(['b']);
    expect(r.ocultos).toBe(0);
  });

  it('ocultar solo esconde lo secundario: las obligaciones se quedan', () => {
    const r = organizarPendientes(lista, true);
    expect(r.importantes.map((p) => p.id)).toEqual(['a']);
    expect(r.secundarios).toEqual([]);
    expect(r.ocultos).toBe(1);
    expect(r.haySecundarios).toBe(true);
  });

  it('sin secundarios no hay nada que ocultar', () => {
    const r = organizarPendientes([aviso('a', 'importante')], true);
    expect(r.ocultos).toBe(0);
    expect(r.haySecundarios).toBe(false);
  });
});

describe('pendientesCentro', () => {
  const base = { alumnosSinProfe: 0, convenios: 1, incidencias: [], params: {} };

  it('sin pendientes devuelve una lista vacía', () => {
    expect(pendientesCentro(base)).toEqual([]);
  });

  it('una sola incidencia abre su conversación; varias, el chat', () => {
    const una = pendientesCentro({ ...base, incidencias: [incidencia('a')] });
    expect(una[0].destino).toEqual({ pathname: '/chat', params: { incidencia: 'a' } });
    const dos = pendientesCentro({ ...base, incidencias: [incidencia('a'), incidencia('b')] });
    expect(dos[0].destino).toEqual({ pathname: '/chat' });
  });

  it('la generalitat conserva el instituto elegido al ir a alumnos y convenios', () => {
    const params = { centro: 'c1' };
    const lista = pendientesCentro({ ...base, alumnosSinProfe: 2, convenios: 0, params });
    expect(lista.map((p) => p.destino)).toEqual([
      { pathname: '/alumnos', params },
      { pathname: '/centro', params },
    ]);
  });
});
