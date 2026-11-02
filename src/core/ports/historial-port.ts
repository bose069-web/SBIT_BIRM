import type { EntradaHistorial } from '../domain/historial';

export interface HistorialPort {
  /**
   * Las últimas entradas del dossier, la más reciente primero. Falla con
   * `HistorialNoDisponibleError` si la base de datos aún no tiene el historial.
   */
  listar(dossierId: string, limite: number): Promise<EntradaHistorial[]>;
}
