import type { Centro, Persona, ProfeConAlumnos } from '../domain/centro';
import { SinPermisoError } from '../domain/errores';
import type { Usuario } from '../domain/usuario';
import type { GestionCentroPort } from '../ports/gestion-centro-port';

import { administraCentro } from './centro';

// El instituto no reparte alumnos sueltos: trabaja con sus profesores. Ve qué alumnos lleva cada
// profe, quiénes siguen sin tutor y puede mover una lista de alumnos de un profe a otro de golpe.
// Las reglas también están en la base de datos; aquí se comprueban antes para dar errores claros.

export class RepartoError extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = 'RepartoError';
  }
}

export interface RepartoProfes {
  centro: Centro;
  /** Profes del centro con sus alumnos dentro. */
  profes: ProfeConAlumnos[];
  /** Alumnos del centro que todavía no tienen profe. */
  sinProfe: Persona[];
}

const porNombre = (a: { nombre: string }, b: { nombre: string }) =>
  a.nombre.localeCompare(b.nombre, 'es');

export async function obtenerRepartoProfes(
  port: GestionCentroPort,
  usuario: Usuario,
  centroId: string,
): Promise<RepartoProfes> {
  if (!administraCentro(usuario, centroId)) {
    throw new SinPermisoError('ver los profes de este centro');
  }
  const [centro, personas] = await Promise.all([
    port.obtenerCentro(centroId),
    port.listarPersonas(centroId),
  ]);
  if (!centro) throw new RepartoError('No se encuentra el centro');

  const delCentro = personas.filter((p) => p.centroId === centroId);
  const alumnos = delCentro.filter((p) => p.rol === 'alumno');
  const profes = delCentro
    .filter((p) => p.rol === 'profe')
    .map((p): ProfeConAlumnos => ({
      ...p,
      alumnos: alumnos.filter((a) => a.profeId === p.id).sort(porNombre),
    }))
    .sort(porNombre);

  return {
    centro,
    profes,
    sinProfe: alumnos.filter((a) => a.profeId === null).sort(porNombre),
  };
}

/**
 * Pasa una lista de alumnos al profe indicado (`null` = dejarlos sin profe). Devuelve cuántos se
 * han movido, ya sin repetidos. Sus dossiers pasan también al nuevo profe: eso lo hace la base.
 */
export async function reasignarAlumnos(
  port: GestionCentroPort,
  usuario: Usuario,
  alumnos: Persona[],
  profe: Persona | null,
): Promise<number> {
  if (alumnos.length === 0) throw new RepartoError('Elige al menos un alumno');

  const centroId = alumnos[0].centroId;
  for (const alumno of alumnos) {
    if (alumno.rol !== 'alumno' || !alumno.centroId) {
      throw new RepartoError('Solo se reasignan alumnos de un centro');
    }
    if (alumno.centroId !== centroId) {
      throw new RepartoError('Todos los alumnos tienen que ser del mismo centro');
    }
  }
  if (!centroId || !administraCentro(usuario, centroId)) {
    throw new SinPermisoError('repartir los alumnos de este centro');
  }
  if (profe && (profe.rol !== 'profe' || profe.centroId !== centroId)) {
    throw new RepartoError('El profe tiene que ser del mismo centro que los alumnos');
  }

  const ids = [...new Set(alumnos.map((a) => a.id))];
  await port.asignarProfeEnBloque(ids, profe?.id ?? null);
  return ids.length;
}
