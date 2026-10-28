import type {
  BorradorIncidencia,
  CambiosIncidencia,
  Incidencia,
  MensajeIncidencia,
} from '../domain/incidencia';

export interface IncidenciaPort {
  /**
   * Las que abrió el usuario, las que atiende (instituto: su centro; generalitat: todas) y,
   * para el profe, las de sus alumnos.
   */
  listar(): Promise<Incidencia[]>;
  /** Centro, autor y estado inicial los pone el sistema. */
  abrir(borrador: BorradorIncidencia): Promise<Incidencia>;
  /** Quien la abrió corrige título y descripción mientras sigue abierta. */
  corregir(id: string, titulo: string, descripcion: string): Promise<Incidencia>;
  /** Quien la atiende cambia estado, prioridad, respuesta o la escala. */
  atender(id: string, cambios: CambiosIncidencia): Promise<Incidencia>;
  borrar(id: string): Promise<void>;
  /** Conversación de la incidencia, de la más antigua a la más reciente. */
  listarMensajes(incidenciaId: string): Promise<MensajeIncidencia[]>;
  /** Autor y fecha los pone el sistema. */
  enviarMensaje(incidenciaId: string, texto: string): Promise<MensajeIncidencia>;
}
