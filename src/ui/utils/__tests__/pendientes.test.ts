import { crearDossier } from '@/core/__fixtures__/datos';
import type { ValoracionFinal, ValoracionMensual } from '@/core/domain/valoracion';

import {
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

  it('solo lista incidencias sin resolver, cada una con su conversación', () => {
    const lista = pendientesAlumno(
      alumno({ incidencias: [incidencia('a'), incidencia('b', 'resuelta')] }),
    );
    expect(lista.map((p) => p.destino)).toEqual([
      { pathname: '/chat', params: { incidencia: 'a' } },
    ]);
  });

  it('tolera que tareas e incidencias no se hayan podido cargar', () => {
    expect(pendientesAlumno(alumno({ tareas: null, incidencias: null }))).toEqual([]);
  });
});

describe('pendientesEmpresa', () => {
  it('abre la valoración del mes entero de ese alumno', () => {
    const dossier = crearDossier({ id: 'd1' });
    const [informe] = pendientesEmpresa([{ dossier, mes: '2026-11' }]);
    expect(informe.accion).toBe('Valorar');
    expect(informe.destino).toEqual({ pathname: '/', params: { valorar: 'd1', mes: '2026-11' } });
  });
});

describe('pendientesProfe', () => {
  it('une incidencias abiertas, alumnos sin apuntar y meses sin valorar', () => {
    const lista = pendientesProfe({
      incidencias: [incidencia('a'), incidencia('b', 'resuelta')],
      sinApuntar: [{ dossierId: 'd1', nombre: 'Ana', dias: 4, ultimo: null }],
      faltaValorar: [{ dossierId: 'd2', nombre: 'Luis', empresa: null, meses: ['2026-11'] }],
    });
    expect(lista.map((p) => p.id)).toEqual(['incidencia-a', 'sin-apuntar-d1', 'falta-valorar-d2']);
    expect(lista[1].destino).toEqual({ pathname: '/', params: { dossier: 'd1' } });
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
