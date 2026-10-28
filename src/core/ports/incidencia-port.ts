import type { BorradorIncidencia, CambiosIncidencia, Incidencia } from '../domain/incidencia';

export interface IncidenciaPort {
  /** Las que abrió el usuario y las que atiende (instituto: su centro; generalitat: todas). */
  listar(): Promise<Incidencia[]>;
  /** Centro, autor y estado inicial los pone el sistema. */
  abrir(borrador: BorradorIncidencia): Promise<Incidencia>;
  /** Quien la abrió corrige título y descripción mientras sigue abierta. */
  corregir(id: string, titulo: string, descripcion: string): Promise<Incidencia>;
  /** Quien la atiende cambia estado, prioridad, respuesta o la escala. */
  atender(id: string, cambios: CambiosIncidencia): Promise<Incidencia>;
  borrar(id: string): Promise<void>;
}
