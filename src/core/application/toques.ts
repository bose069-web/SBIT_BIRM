import type { Dossier } from '../domain/dossier';
import { SinPermisoError } from '../domain/errores';
import { comprobarDiasSinApuntar, estaPendiente, type Toque } from '../domain/toque';
import type { Usuario } from '../domain/usuario';
import type { ToquePort } from '../ports/toque-port';

// La base de datos (RLS y los triggers de `toques`) también impide todo esto; aquí se avisa antes.

/** Solo el profe tutor del dossier: ni el instituto, ni la generalitat, ni otro profe. */
export function puedeDarToques(usuario: Usuario, dossier: Pick<Dossier, 'tutorId'>): boolean {
  return usuario.rol === 'profe' && usuario.id === dossier.tutorId;
}

/** El profe avisa de que el alumno lleva días sin apuntar. */
export async function darToque(
  toques: ToquePort,
  usuario: Usuario,
  dossier: Dossier,
  diasSinApuntar: number,
): Promise<Toque> {
  if (!puedeDarToques(usuario, dossier)) throw new SinPermisoError('dar un toque a este alumno');
  comprobarDiasSinApuntar(diasSinApuntar);
  return toques.dar(dossier.id, diasSinApuntar);
}

/** Lo que se enseña en el Inicio del alumno: los toques que aún no ha resuelto. */
export async function toquesPendientes(toques: ToquePort): Promise<Toque[]> {
  return (await toques.pendientesDelAlumno()).filter(estaPendiente);
}

/** El alumno marca que ha visto el aviso. Solo el alumno del dossier. */
export async function marcarToqueVisto(
  toques: ToquePort,
  usuario: Usuario,
  dossier: Dossier,
  toque: Toque,
): Promise<Toque> {
  const esSuAlumno = usuario.rol === 'alumno' && usuario.id === dossier.alumnoId;
  if (!esSuAlumno || toque.dossierId !== dossier.id) {
    throw new SinPermisoError('marcar el toque como visto');
  }
  return toques.marcarVisto(toque.id);
}

/** El último toque de cada dossier, para ver en el seguimiento del profe a quién avisó y cuándo. */
export function ultimosToques(toques: ToquePort, dossierIds: string[]): Promise<Toque[]> {
  return toques.ultimosPorDossier(dossierIds);
}
