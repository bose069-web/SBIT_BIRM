import { DatosInvalidosError } from './errores';

// El profe (o el instituto) encarga tareas al alumno; el alumno solo las marca como hechas.

export interface Tarea {
  id: string;
  dossierId: string;
  titulo: string;
  descripcion: string | null;
  /** `AAAA-MM-DD` o sin fecha. */
  fechaLimite: string | null;
  completada: boolean;
  creadaPor: string | null;
}

export type BorradorTarea = Pick<Tarea, 'dossierId' | 'titulo' | 'descripcion' | 'fechaLimite'>;

export function comprobarTarea(borrador: BorradorTarea): void {
  if (!borrador.titulo.trim()) throw new DatosInvalidosError('La tarea necesita un título');
  if (borrador.fechaLimite && !/^\d{4}-\d{2}-\d{2}$/.test(borrador.fechaLimite)) {
    throw new DatosInvalidosError('Fecha límite no válida');
  }
}

/** Pendiente y con la fecha límite ya pasada. */
export function tareaVencida(tarea: Pick<Tarea, 'completada' | 'fechaLimite'>, hoy: string) {
  return !tarea.completada && tarea.fechaLimite !== null && tarea.fechaLimite < hoy;
}

/** Pendientes primero (las que vencen antes arriba, las sin fecha al final) y luego las hechas. */
export function ordenarTareas<T extends Pick<Tarea, 'completada' | 'fechaLimite' | 'titulo'>>(
  tareas: T[],
): T[] {
  return [...tareas].sort(
    (a, b) =>
      Number(a.completada) - Number(b.completada) ||
      (a.fechaLimite ?? '9999').localeCompare(b.fechaLimite ?? '9999') ||
      a.titulo.localeCompare(b.titulo),
  );
}
