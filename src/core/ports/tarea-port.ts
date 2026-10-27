import type { BorradorTarea, Tarea } from '../domain/tarea';

export interface TareaPort {
  listar(dossierId: string): Promise<Tarea[]>;
  /** Quién la crea es el usuario con sesión. */
  crear(borrador: BorradorTarea): Promise<Tarea>;
  marcar(id: string, completada: boolean): Promise<Tarea>;
  borrar(id: string): Promise<void>;
}
