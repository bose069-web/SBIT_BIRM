import type { BorradorEvento, Evento } from '../domain/evento';

export interface EventoPort {
  /** Eventos generales y los de los dossiers que ve el usuario, entre dos fechas (incluidas). */
  listar(desde: string, hasta: string): Promise<Evento[]>;
  crear(borrador: BorradorEvento): Promise<Evento>;
  borrar(id: string): Promise<void>;
}
