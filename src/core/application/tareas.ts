import type { Dossier } from '../domain/dossier';
import { SinPermisoError } from '../domain/errores';
import { comprobarTarea, ordenarTareas, type BorradorTarea, type Tarea } from '../domain/tarea';
import { gestionaDossier, type Usuario } from '../domain/usuario';
import type { TareaPort } from '../ports/tarea-port';

// La base de datos (RLS y el trigger proteger_tarea) también lo impide; aquí se avisa antes.

export async function listarTareas(tareas: TareaPort, dossierId: string): Promise<Tarea[]> {
  return ordenarTareas(await tareas.listar(dossierId));
}

/** El profe del alumno, su instituto o la generalitat encargan una tarea. */
export function crearTarea(
  tareas: TareaPort,
  usuario: Usuario,
  dossier: Dossier,
  borrador: BorradorTarea,
): Promise<Tarea> {
  if (!gestionaDossier(usuario, dossier)) throw new SinPermisoError('encargar tareas');
  const limpio: BorradorTarea = {
    ...borrador,
    dossierId: dossier.id,
    titulo: borrador.titulo.trim(),
    descripcion: borrador.descripcion?.trim() || null,
  };
  comprobarTarea(limpio);
  return tareas.crear(limpio);
}

/** El alumno marca sus tareas; quien gestiona el dossier también puede. */
export function marcarTarea(
  tareas: TareaPort,
  usuario: Usuario,
  dossier: Dossier,
  tarea: Tarea,
  completada: boolean,
): Promise<Tarea> {
  const esSuAlumno = usuario.rol === 'alumno' && usuario.id === dossier.alumnoId;
  if (!esSuAlumno && !gestionaDossier(usuario, dossier)) throw new SinPermisoError('marcar tareas');
  return tareas.marcar(tarea.id, completada);
}

export function borrarTarea(
  tareas: TareaPort,
  usuario: Usuario,
  dossier: Dossier,
  tarea: Tarea,
): Promise<void> {
  if (!gestionaDossier(usuario, dossier)) throw new SinPermisoError('borrar tareas');
  return tareas.borrar(tarea.id);
}
